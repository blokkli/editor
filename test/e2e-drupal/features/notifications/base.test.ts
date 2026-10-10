import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { toolbarButton } from '../../support/toolbar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/**
 * The notifications feature adds a toolbar button (id `notifications`) with an
 * unread-count badge and a dropdown that lists notifications (newest first,
 * paginated). Anna's come from the seeded comments that mention her
 * (content/comments.yml): more than two pages, all unread. Drupal shows 16 per
 * page. Tests share one editor page and progress state monotonically: read the
 * initial badge, open the dropdown (mark first page read), load the next page,
 * inspect item deep-links, then mark all as read.
 *
 * Two comments are referenced by their keys, because the deep-link assertions
 * need a known host: `mention-32` on the page "Mentions", and
 * `removed-question`, whose page is deleted after seeding (`deleted: true`).
 * Both are among the newest, so on the first page.
 */

const PER_PAGE = 16

const MENTIONS = seedUuid('node', 'mentions')
const MENTION = seedUuid('blokkli_comment', 'mention-32')
const REMOVED_QUESTION = seedUuid('blokkli_comment', 'removed-question')

const badge = (page: Page): Locator =>
  page.locator('[data-test="notifications-unread-badge"]')

const loadMore = (page: Page): Locator =>
  page.locator('[data-test="notifications-load-more"]')

const markAllRead = (page: Page): Locator =>
  page.locator('[data-test="notifications-mark-all-read"]')

const notificationItems = (page: Page): Locator =>
  page.locator('[data-test^="notification-"]')

const notificationItem = (page: Page, uuid: string): Locator =>
  page.locator(`[data-test="notification-${uuid}"]`)

/** The current unread count via the adapter. This method is pure — it does not
 *  mark anything read, so it's safe to call between assertions. */
const unreadCount = (page: Page): Promise<number> =>
  withApp(page, (app) => app.adapter.loadUnreadNotificationsCount!())

/** The uuid of the notification about a comment, from the first page, without
 *  marking anything read. */
const notificationAbout = (page: Page, commentUuid: string): Promise<string> =>
  page.evaluate(async (commentUuid) => {
    const { items } = await window.__BLOKKLI__!.app!.adapter.loadNotifications!(
      {
        markAsRead: false,
      },
    )
    return items.find((item) => item.relatedEntityUuid === commentUuid)!.uuid
  }, commentUuid)

/** Read the badge's number, or `null` when the badge has been removed (the
 *  badge is `v-if`'d on `unreadCount > 0`). */
async function badgeNumber(page: Page): Promise<number | null> {
  const el = badge(page)
  if (!(await el.count())) {
    return null
  }
  return Number((await el.textContent())?.trim())
}

describe('The notifications feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  test('shows the unread badge with the seeded unread count', async () => {
    const expected = await unreadCount(page)
    expect(expected).toBeGreaterThan(PER_PAGE * 2)
    await expect.poll(() => badgeNumber(page)).toBe(expected)
    expect(await toolbarButton(page, 'notifications').isDisabled()).toBe(false)
  })

  test('opening the dropdown lists the first page and reduces the unread badge', async () => {
    const before = await unreadCount(page)
    await toolbarButton(page, 'notifications').click()
    // Wait for the list to render at least one item.
    await notificationItems(page).first().waitFor({ state: 'visible' })

    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE)

    // The page response carries the post-mark unread count, which the parent
    // writes through to the badge. With one page marked of more than two
    // unread, the badge stays present (just lower).
    await expect.poll(() => unreadCount(page)).toBe(before - PER_PAGE)
    await expect.poll(() => badgeNumber(page)).toBe(before - PER_PAGE)
  })

  test('"Load more" appends the next page', async () => {
    // The dropdown is still open from the previous test, with PER_PAGE items.
    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE)
    expect(await loadMore(page).count()).toBe(1)

    await loadMore(page).click()
    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE * 2)
    // Still more to load (more than two pages) — the button remains.
    expect(await loadMore(page).count()).toBe(1)
  })

  test('comment notifications deep-link with host + comment params; hostless items are not links', async () => {
    // A mention on the page "Mentions": a link to the page in the editor,
    // with the comment to open.
    const mention = notificationItem(
      page,
      await notificationAbout(page, MENTION),
    )
    expect(await mention.evaluate((el) => el.tagName)).toBe('A')
    const mentionHref = await mention.getAttribute('href')
    expect(mentionHref).toContain(`blokkliEditing=${MENTIONS}`)
    expect(mentionHref).toContain(`blokkliComment=${MENTION}`)

    // A mention on a page that's gone: no host, not a link.
    const hostless = notificationItem(
      page,
      await notificationAbout(page, REMOVED_QUESTION),
    )
    expect(await hostless.evaluate((el) => el.tagName)).toBe('DIV')
    expect(await hostless.getAttribute('href')).toBeNull()
  })

  test('"Mark all as read" clears the badge and hides the button', async () => {
    expect(await markAllRead(page).count()).toBe(1)
    await markAllRead(page).click()

    // Both the badge and the button are `v-if`'d on `unreadCount > 0`, so
    // they leave the DOM rather than just hiding.
    await badge(page).waitFor({ state: 'detached' })
    await markAllRead(page).waitFor({ state: 'detached' })

    await expect.poll(() => unreadCount(page)).toBe(0)
  })
})
