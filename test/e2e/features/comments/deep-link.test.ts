import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'

/**
 * Comment deep-linking: opening the editor at `?blokkliComment=<uuid>`
 * (typically from a notification) auto-opens the comments sidebar,
 * scrolls the linked comment into view, and shows a persistent highlight
 * ring on the matching comment (root *or* reply). The ring clears on the
 * first `pointerleave` after the user engages with it. The URL is
 * intentionally preserved — the link is a stable representation of the
 * view, and a refresh should land the user back in the same place.
 *
 * The mock seeds deterministic comments (see `commentStorage.ts`); these
 * tests link to specific seeded uuids:
 * - `seed-2-root` — single unresolved root, no replies
 * - `seed-1-r2`  — reply under `seed-1-root` (both unresolved)
 * - `seed-5-root` — resolved root (verifies that deep-linking to a
 *   resolved thread flips `showResolved` on so the thread is visible)
 * - `does-not-exist` — verifies the feature short-circuits on a missing
 *   target instead of opening an empty sidebar
 *
 * Page lifecycle: the deep-link logic runs once in `onMounted`, reading
 * the route query — it can't be re-triggered without re-navigating. So
 * each scenario needs its own page; opening them in parallel keeps the
 * file fast. The pointerleave test reuses `rootLinkPage` and runs LAST
 * (it mutates the highlight state).
 *
 * Highlight state is asserted via `data-test-highlight` on `<Comment>` —
 * Thread always passes the boolean prop, so the attribute renders as
 * `"true"` or `"false"` (never absent); assert exact-string equality
 * (see the boolean-attribute trap in the skill).
 */

const ROOT_LINK_PATH = `${EDITOR_PATH}&blokkliComment=seed-2-root`
const REPLY_LINK_PATH = `${EDITOR_PATH}&blokkliComment=seed-1-r2`
const RESOLVED_LINK_PATH = `${EDITOR_PATH}&blokkliComment=seed-5-root`
const UNKNOWN_LINK_PATH = `${EDITOR_PATH}&blokkliComment=does-not-exist`

function commentEl(page: Page, uuid: string) {
  return page.locator(`[data-test="comment"][data-test-uuid="${uuid}"]`)
}

function commentThread(page: Page, uuid: string) {
  return page.locator(`[data-test="comment-thread"][data-test-uuid="${uuid}"]`)
}

/** The sidebar add button only renders while the comments sidebar is the
 * active pane — so its visibility doubles as a "sidebar open" signal. */
function sidebarAddButton(page: Page) {
  return page.locator('[data-test="comments-sidebar-add-button"]')
}

describe('The comments deep-link feature', async () => {
  await setupEditorE2E()

  let rootLinkPage: Page
  let replyLinkPage: Page
  let resolvedLinkPage: Page
  let unknownLinkPage: Page

  beforeAll(async () => {
    ;[rootLinkPage, replyLinkPage, resolvedLinkPage, unknownLinkPage] =
      await Promise.all([
        openEditor(ROOT_LINK_PATH),
        openEditor(REPLY_LINK_PATH),
        openEditor(RESOLVED_LINK_PATH),
        openEditor(UNKNOWN_LINK_PATH),
      ])
  })

  afterAll(async () => {
    await Promise.all([
      rootLinkPage.close(),
      replyLinkPage.close(),
      resolvedLinkPage.close(),
      unknownLinkPage.close(),
    ])
  })

  test('deep-linking to a root auto-opens the sidebar, highlights the comment, and preserves the URL', async () => {
    await sidebarAddButton(rootLinkPage).waitFor({ state: 'visible' })

    const target = commentEl(rootLinkPage, 'seed-2-root')
    await target.waitFor({ state: 'visible' })
    expect(await target.getAttribute('data-test-highlight')).toBe('true')

    // The URL is intentionally preserved — never stripped to "clean up".
    expect(rootLinkPage.url()).toContain('blokkliComment=seed-2-root')
  })

  test('deep-linking to a reply highlights the reply but not its root', async () => {
    await sidebarAddButton(replyLinkPage).waitFor({ state: 'visible' })

    const reply = commentEl(replyLinkPage, 'seed-1-r2')
    const root = commentEl(replyLinkPage, 'seed-1-root')
    await reply.waitFor({ state: 'visible' })

    // The reply is the deep-link target. The root is visible (the thread
    // is rendered around the highlighted reply) but explicitly not marked.
    expect(await reply.getAttribute('data-test-highlight')).toBe('true')
    expect(await root.getAttribute('data-test-highlight')).toBe('false')
  })

  test('deep-linking to a resolved comment flips show-resolved on so the thread is visible', async () => {
    // showResolved defaults to false; the deep-link handler flips it to
    // true when the target's root is resolved, so `seed-5-root` is
    // included in the sidebar's visible roots.
    await sidebarAddButton(resolvedLinkPage).waitFor({ state: 'visible' })

    await commentThread(resolvedLinkPage, 'seed-5-root').waitFor({
      state: 'visible',
    })
    const target = commentEl(resolvedLinkPage, 'seed-5-root')
    expect(await target.getAttribute('data-test-highlight')).toBe('true')

    // The toggle is now on — exposed via the form-toggle input under the
    // `comments-show-resolved` wrapper.
    const showResolved = resolvedLinkPage
      .locator('[data-test="comments-show-resolved"]')
      .locator('[data-test="form-toggle-input"]')
    expect(await showResolved.isChecked()).toBe(true)
  })

  test('deep-linking to an unknown uuid leaves the sidebar closed and preserves the URL', async () => {
    // No match → the feature returns before `eventBus.emit('sidebar:open')`
    // ever fires, so the sidebar pane is not mounted and its add button
    // is absent from the DOM entirely.
    expect(await sidebarAddButton(unknownLinkPage).count()).toBe(0)
    // The URL is preserved regardless — we never `router.replace` to strip
    // the query, even when nothing matched.
    expect(unknownLinkPage.url()).toContain('blokkliComment=does-not-exist')
  })

  test('pointerleave after engaging clears the highlight', async () => {
    // Runs LAST against `rootLinkPage`: this test mutates the highlight
    // state by hovering and moving the pointer away, so any earlier
    // assertion expecting `data-test-highlight="true"` (the first test on
    // this page) must run before it.
    const target = commentEl(rootLinkPage, 'seed-2-root')
    expect(await target.getAttribute('data-test-highlight')).toBe('true')

    await target.hover()
    // Move the pointer well outside the comment's bounding box to fire
    // pointerleave on the comment root. (0,0) is the top-left of the
    // viewport — far from the sidebar comment on the right.
    await rootLinkPage.mouse.move(0, 0)

    await expect
      .poll(() => target.getAttribute('data-test-highlight'))
      .toBe('false')
  })
})
