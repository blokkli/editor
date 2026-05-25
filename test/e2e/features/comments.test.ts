import { describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { selectBlock } from './../support/blocks'
import { topLevelBlockUuids } from './../support/selection'
import { itemAction } from './../support/itemActions'
import { openSidebar } from './../support/sidebar'
import { dialog, dialogSubmit } from './../support/overlays'

/**
 * The comments feature has three parts; we cover the **item action** (attach a
 * comment to the selected blocks via the floating add form) and the **sidebar**
 * (threads, resolve/unresolve, reply, edit, delete, the "Show resolved" toggle,
 * the unresolved badge). The canvas Overlay is intentionally skipped.
 *
 * The playground mock seeds comments (German bodies, deterministic `seed-*`
 * uuids: 7 roots — 2 resolved, 5 unresolved — + 8 replies) into localStorage,
 * fresh per page. The feature loads them once at editor init and replaces its
 * list after each of its own handlers, so driving the UI keeps the sidebar in
 * sync. The source of truth for assertions is `adapter.loadComments()` (read via
 * `withApp`): we drive the real UI and assert on comment *state* (uuids, parent
 * links, `resolved`, `blockUuids`, body) + DOM structure — never on the seeded,
 * localized text. Comments we create carry a unique ASCII marker so
 * `body.includes(marker)` is locale-independent.
 *
 * Comment bodies are rich text: the input is a Tiptap contenteditable
 * (`data-test="richtext-editor"`), submitted via the form's
 * `comment-input-submit` button (auto-enabled once non-empty — Playwright's click
 * waits for it). Action buttons (resolve/edit/delete) are opacity-0 until hover
 * but remain clickable.
 */

type CommentItem = {
  uuid: string
  parentUuid?: string
  resolved: boolean
  blockUuids?: string[]
  body: string
  updated?: string
}

const loadComments = (page: Page): Promise<CommentItem[]> =>
  withApp(page, (app) => app.adapter.loadComments!() as Promise<CommentItem[]>)

const roots = async (page: Page): Promise<CommentItem[]> =>
  (await loadComments(page)).filter((c) => !c.parentUuid)

function commentThread(page: Page, uuid: string): Locator {
  return page.locator(`[data-test="comment-thread"][data-test-uuid="${uuid}"]`)
}

function commentEl(page: Page, uuid: string): Locator {
  return page.locator(`[data-test="comment"][data-test-uuid="${uuid}"]`)
}

/** The number shown in the sidebar's unresolved badge (null when absent). */
async function unresolvedBadge(page: Page): Promise<number | null> {
  const badge = page.locator('[data-test="comments-unresolved-badge"]')
  if (!(await badge.count())) {
    return null
  }
  return Number((await badge.textContent())?.trim())
}

/** Type `text` into the rich-text editor within `scope`. When `replace`, clears
 * any existing content first (used by the edit form, which is pre-filled). */
async function typeBody(
  page: Page,
  scope: Locator,
  text: string,
  replace = false,
): Promise<void> {
  const editor = scope.locator('[data-test="richtext-editor"]')
  await editor.waitFor({ state: 'visible' })
  await editor.click()
  if (replace) {
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.press('Delete')
  }
  await editor.pressSequentially(text)
}

/** Submit the comment form within `scope` (the submit button auto-enables). */
function submitBody(scope: Locator): Promise<void> {
  return scope.locator('[data-test="comment-input-submit"]').click()
}

/** Open the comments sidebar and wait for its content to mount. */
async function openComments(page: Page): Promise<void> {
  await openSidebar(page, 'comments')
  await page
    .locator('[data-test="comments-sidebar-add-button"]')
    .waitFor({ state: 'visible' })
}

/**
 * Create a root comment via the sidebar add form (authored by the current user,
 * so it gets edit/delete actions). Returns its uuid.
 */
async function addSidebarComment(page: Page, text: string): Promise<string> {
  const before = new Set((await loadComments(page)).map((c) => c.uuid))
  await page.locator('[data-test="comments-sidebar-add-button"]').click()
  // Only one comment form is open at a time, so this is unambiguous.
  const form = page.locator('[data-test="comment-input"]')
  await typeBody(page, form, text)
  await submitBody(form)
  await expect
    .poll(async () =>
      (await loadComments(page)).some(
        (c) => !before.has(c.uuid) && c.body.includes(text),
      ),
    )
    .toBe(true)
  const added = (await loadComments(page)).find(
    (c) => !before.has(c.uuid) && c.body.includes(text),
  )!
  return added.uuid
}

describe('The comments feature', async () => {
  await setupEditorE2E()

  test('the add-comment action shows for a selection and opens the add form', async () => {
    const page = await openEditor()
    const uuid = (await topLevelBlockUuids(page))[0]!

    const action = itemAction(page, 'add_comment')
    // The action only surfaces once a block is selected.
    expect(await action.isVisible()).toBe(false)

    await selectBlock(page, uuid)
    await action.waitFor({ state: 'visible' })

    // Clicking it opens the floating add form.
    await action.click()
    await page.locator('[data-test="comment-add-form"]').waitFor({
      state: 'visible',
    })

    await page.close()
  })

  test('adding a comment via the item action attaches it to the selected block', async () => {
    const page = await openEditor()
    const MARKER = 'ITEM_ACTION_MARKER_1'
    const uuid = (await topLevelBlockUuids(page))[0]!

    await selectBlock(page, uuid)
    await itemAction(page, 'add_comment').click()
    const addForm = page.locator('[data-test="comment-add-form"]')
    await typeBody(page, addForm, MARKER)
    await submitBody(addForm)

    // The new root comment references the block it was added from.
    await expect
      .poll(async () =>
        (await roots(page)).find(
          (c) => c.body.includes(MARKER) && c.blockUuids?.includes(uuid),
        ),
      )
      .toBeTruthy()
    // The form closes after submitting.
    await addForm.waitFor({ state: 'detached' })

    await page.close()
  })

  test('the sidebar lists unresolved threads and hides resolved ones by default', async () => {
    const page = await openEditor()
    await openComments(page)

    const allRoots = await roots(page)
    const unresolved = allRoots.filter((r) => !r.resolved)
    const resolved = allRoots.filter((r) => r.resolved)
    expect(resolved.length).toBeGreaterThan(0)

    // Resolved threads are hidden until "Show resolved" is on.
    expect(await page.locator('[data-test="comment-thread"]').count()).toBe(
      unresolved.length,
    )
    expect(await commentThread(page, resolved[0]!.uuid).count()).toBe(0)

    await page.close()
  })

  test('"Show resolved" reveals resolved threads', async () => {
    const page = await openEditor()
    await openComments(page)

    const allRoots = await roots(page)
    const resolvedUuid = allRoots.find((r) => r.resolved)!.uuid
    expect(await commentThread(page, resolvedUuid).count()).toBe(0)

    await page.locator('[data-test="comments-show-resolved"]').click()

    await commentThread(page, resolvedUuid).waitFor({ state: 'visible' })
    expect(await page.locator('[data-test="comment-thread"]').count()).toBe(
      allRoots.length,
    )

    await page.close()
  })

  test('resolving a thread marks it resolved, keeps it visible, and updates the badge', async () => {
    const page = await openEditor()
    await openComments(page)

    const badgeBefore = await unresolvedBadge(page)
    const target = (await roots(page)).find((r) => !r.resolved)!.uuid

    await commentThread(page, target)
      .locator('[data-test="comment-action-resolve"]')
      .click()

    await expect
      .poll(
        async () =>
          (await roots(page)).find((r) => r.uuid === target)?.resolved,
      )
      .toBe(true)
    // Resolved during this session → it stays visible (show-resolved is still off).
    expect(await commentThread(page, target).count()).toBe(1)
    await expect.poll(() => unresolvedBadge(page)).toBe((badgeBefore ?? 0) - 1)

    await page.close()
  })

  test('unresolving a resolved thread flips it back', async () => {
    const page = await openEditor()
    await openComments(page)
    await page.locator('[data-test="comments-show-resolved"]').click()

    const badgeBefore = (await unresolvedBadge(page)) ?? 0
    const target = (await roots(page)).find((r) => r.resolved)!.uuid

    await commentThread(page, target)
      .locator('[data-test="comment-action-unresolve"]')
      .click()

    await expect
      .poll(
        async () =>
          (await roots(page)).find((r) => r.uuid === target)?.resolved,
      )
      .toBe(false)
    await expect.poll(() => unresolvedBadge(page)).toBe(badgeBefore + 1)

    await page.close()
  })

  test('replying adds a reply under the thread', async () => {
    const page = await openEditor()
    const MARKER = 'REPLY_MARKER_1'
    await openComments(page)

    const target = (await roots(page)).find((r) => !r.resolved)!.uuid
    const thread = commentThread(page, target)
    await thread.locator('[data-test="comment-reply-button"]').click()
    await typeBody(page, thread, MARKER)
    await submitBody(thread)

    await expect
      .poll(async () =>
        (await loadComments(page)).some(
          (c) => c.parentUuid === target && c.body.includes(MARKER),
        ),
      )
      .toBe(true)

    await page.close()
  })

  test('the sidebar add form creates a root comment', async () => {
    const page = await openEditor()
    const MARKER = 'SIDEBAR_ADD_MARKER_1'
    await openComments(page)

    const uuid = await addSidebarComment(page, MARKER)

    const created = (await loadComments(page)).find((c) => c.uuid === uuid)!
    expect(created.parentUuid).toBeFalsy()
    // A sidebar comment isn't attached to any block.
    expect(created.blockUuids ?? []).toHaveLength(0)
    // It shows up as a thread in the list.
    await commentThread(page, uuid).waitFor({ state: 'visible' })

    await page.close()
  })

  test('editing an own comment updates the body', async () => {
    const page = await openEditor()
    await openComments(page)
    const uuid = await addSidebarComment(page, 'ORIGINAL_BODY_MARKER')

    await commentEl(page, uuid)
      .locator('[data-test="comment-action-edit"]')
      .click()
    // The edit form replaces the comment display inside the same thread.
    const thread = commentThread(page, uuid)
    await typeBody(page, thread, 'EDITED_BODY_MARKER', true)
    await submitBody(thread)

    await expect
      .poll(async () => {
        const c = (await loadComments(page)).find((c) => c.uuid === uuid)
        return c?.body.includes('EDITED_BODY_MARKER') && !!c?.updated
      })
      .toBe(true)

    await page.close()
  })

  test('deleting an own comment removes it via the confirm dialog', async () => {
    const page = await openEditor()
    await openComments(page)
    const uuid = await addSidebarComment(page, 'TO_DELETE_MARKER')

    await commentEl(page, uuid)
      .locator('[data-test="comment-action-delete"]')
      .click()

    const confirm = dialog(page, 'comment-delete-' + uuid)
    await confirm.waitFor({ state: 'visible' })
    await dialogSubmit(page).click()

    await expect
      .poll(async () => (await loadComments(page)).some((c) => c.uuid === uuid))
      .toBe(false)
    expect(await commentThread(page, uuid).count()).toBe(0)

    await page.close()
  })
})
