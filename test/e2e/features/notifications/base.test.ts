import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { toolbarButton } from './../../support/toolbar'

/**
 * The notifications feature adds a toolbar button (id `notifications`) with an
 * unread-count badge and a dropdown that lists notifications (newest first,
 * paginated). The playground mock seeds 26 notifications via
 * `playground/app/mock/notificationStorage.ts` — 14 unread, 12 read — and
 * paginates 3 per page (`NOTIFICATIONS_PER_PAGE` in the mock adapter). The
 * store is in-memory and re-seeds on a full page reload only, so tests share
 * one editor page and progress state monotonically: read the initial badge,
 * open the dropdown (mark first page read), exhaust pagination, inspect item
 * deep-links, then mark all as read.
 *
 * Three fixture uuids are referenced by name (`notif-1`, `notif-3`,
 * `notif-hostless`) because the deep-link assertions need known types and a
 * known hostless item — picking by raw uuid keeps the assertion independent of
 * the localized title.
 */

const PER_PAGE = 3

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
 *  mark anything read, so it's safe to call between assertions. Never call
 *  `loadNotifications` from a test: it has the `markAsRead` side effect. */
const unreadCount = (page: Page): Promise<number> =>
  withApp(page, (app) => app.adapter.loadUnreadNotificationsCount!())

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
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  test('shows the unread badge with the seeded unread count', async () => {
    const expected = await unreadCount(page)
    expect(expected).toBeGreaterThan(0)
    await expect.poll(() => badgeNumber(page)).toBe(expected)
    expect(await toolbarButton(page, 'notifications').isDisabled()).toBe(false)
  })

  test('opening the dropdown lists the first page and reduces the unread badge', async () => {
    await toolbarButton(page, 'notifications').click()
    // Wait for the list to render at least one item.
    await notificationItems(page).first().waitFor({ state: 'visible' })

    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE)

    // The page response carries the post-mark unread count, which the parent
    // writes through to the badge. With 3 items marked of 14 unread, the
    // badge stays present (just lower).
    const after = await unreadCount(page)
    expect(after).toBeGreaterThan(0)
    await expect.poll(() => badgeNumber(page)).toBe(after)
  })

  test('"Load more" appends the next page', async () => {
    // The dropdown is still open from the previous test, with PER_PAGE items.
    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE)
    expect(await loadMore(page).count()).toBe(1)

    await loadMore(page).click()
    await expect.poll(() => notificationItems(page).count()).toBe(PER_PAGE * 2)
    // Still more to load (we have 26 total, just loaded 6) — button remains.
    expect(await loadMore(page).count()).toBe(1)
  })

  test('comment notifications deep-link with host + comment params; hostless items are not links', async () => {
    // `notif-1` — comment:mention with host=1 and relatedEntityUuid=seed-1-root.
    const mention = notificationItem(page, 'notif-1')
    expect(await mention.evaluate((el) => el.tagName)).toBe('A')
    const mentionHref = await mention.getAttribute('href')
    expect(mentionHref).toContain('blokkliEditing=1')
    expect(mentionHref).toContain('blokkliComment=seed-1-root')

    // `notif-3` — edit-state:approved with host=1 and no relatedEntityUuid.
    const approved = notificationItem(page, 'notif-3')
    expect(await approved.evaluate((el) => el.tagName)).toBe('A')
    const approvedHref = await approved.getAttribute('href')
    expect(approvedHref).toContain('blokkliEditing=1')
    expect(approvedHref).not.toContain('blokkliComment=')

    // `notif-hostless` — no host, not a link.
    const hostless = notificationItem(page, 'notif-hostless')
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
