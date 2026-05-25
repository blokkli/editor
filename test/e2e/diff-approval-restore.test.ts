import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, getHostContext } from './support/session'
import {
  editableState,
  editableText,
  waitForEditableText,
  openEditableField,
} from './support/editable'
import {
  runDiffApproval,
  applyFieldDiff,
  cancelDiff,
  applyDiff,
} from './support/diff'
import { undo } from './support/toolbar'
import { openSidebar } from './support/sidebar'
import { setupEditorE2E } from './support/setup'
import type { EntityContext } from '../../src/runtime/types'

/**
 * Regression test for the DiffApproval DOM-restore bug.
 *
 * When a diff preview is shown, `<ins>`/`<del>` markup is written directly into
 * editable elements via innerHTML. Closing the preview (cancel or apply) must
 * restore the original Vue-managed DOM nodes — otherwise the markup gets stuck
 * and the field stops reacting to subsequent edits (the bug this guards).
 *
 * The scenarios (driven from the playground `test-cases` feature) cover:
 *  - the host entity `title` (a `<BlokkliEditable>` component),
 *  - the host entity `lead` (a bare `v-blokkli-editable` directive — the case
 *    that originally got stuck),
 *  - one random card-block `title` (a block — covered via the global cleanup
 *    assertion below).
 *
 * Plus the end-to-end value paths: inline editing still works after a diff
 * cycle, and a real apply commits the proposed value (with undo reverting it).
 */
describe('DiffApproval DOM restore', async () => {
  await setupEditorE2E()

  /** Count elements still showing diff-preview markup anywhere in the page. */
  function countDiffActive(page: Page): Promise<number> {
    return page.locator('[data-bk-diff-active]').count()
  }

  async function openWithHostFields(): Promise<{
    page: Page
    host: EntityContext
  }> {
    const page = await openEditor()
    const host = await getHostContext(page)

    // The diff scenarios are driven through the playground `test-cases` feature,
    // which only registers its `window.__BLOKKLI__.test` API once its sidebar
    // pane is mounted — so open it before any `runDiffApproval`/`applyFieldDiff`.
    await openSidebar(page, 'test-cases')

    // Precondition: both host editables are present on this page.
    const title = await editableState(page, 'title', host)
    const lead = await editableState(page, 'lead', host)
    expect(title, 'host "title" editable should exist').not.toBeNull()
    expect(lead, 'host "lead" editable should exist').not.toBeNull()

    return { page, host }
  }

  test('shows diff markup, then restores it on cancel', async () => {
    const { page, host } = await openWithHostFields()

    const done = runDiffApproval(page)

    // Preview shown: the toolbar appears and host fields carry diff markup.
    await page.locator('[data-test="diff-approval-cancel"]').waitFor()
    expect((await editableState(page, 'title', host))?.diffActive).toBe(true)
    expect((await editableState(page, 'lead', host))?.diffActive).toBe(true)
    expect(await countDiffActive(page)).toBeGreaterThanOrEqual(2)

    await cancelDiff(page)
    const { applied } = await done
    expect(applied).toBe(false)

    // All preview markup is gone (host fields + the card).
    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )
    const title = await editableState(page, 'title', host)
    const lead = await editableState(page, 'lead', host)
    expect(title?.hasDiffMarkup).toBe(false)
    expect(lead?.hasDiffMarkup).toBe(false)

    await page.close()
  })

  test('restores the DOM on apply', async () => {
    const { page, host } = await openWithHostFields()

    const done = runDiffApproval(page)
    await page.locator('[data-test="diff-approval-apply"]').waitFor()
    expect((await editableState(page, 'lead', host))?.diffActive).toBe(true)

    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)

    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )
    expect((await editableState(page, 'lead', host))?.hasDiffMarkup).toBe(false)

    await page.close()
  })

  test('the lead field still updates on inline edit after a diff-approval cycle', async () => {
    const { page, host } = await openWithHostFields()

    // Reproduce the original bug condition: run a diff-approval cycle first.
    const done = runDiffApproval(page)
    await page.locator('[data-test="diff-approval-cancel"]').waitFor()
    await cancelDiff(page)
    await done
    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )

    // Now edit the lead inline: open the field editor, type, submit.
    const newLead = 'Updated lead via E2E'
    await openEditableField(page, 'lead')
    const textarea = page.locator('#bk-editable-field-textarea')
    await textarea.waitFor()
    await textarea.fill(newLead)
    await textarea.press('Enter')

    // The field's text reflects the new value and carries no leftover markup.
    await waitForEditableText(page, 'lead', host, newLead)
    const lead = await editableState(page, 'lead', host)
    expect(lead?.text.trim()).toBe(newLead)
    expect(lead?.hasDiffMarkup).toBe(false)

    await page.close()
  })

  test('apply commits the new value, and undo restores the original', async () => {
    const { page, host } = await openWithHostFields()

    const original = await editableText(page, 'lead', host)
    const proposed = `${original} — applied by E2E`

    // Apply the diff for real (persists via the adapter on apply).
    const done = applyFieldDiff(page, 'lead', proposed)
    await page.locator('[data-test="diff-approval-apply"]').waitFor()
    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)

    // The field now shows the committed value, with no leftover diff markup.
    await waitForEditableText(page, 'lead', host, proposed)
    expect((await editableState(page, 'lead', host))?.hasDiffMarkup).toBe(false)

    // Pressing undo reverts the mutation back to the original value.
    await undo(page)
    await waitForEditableText(page, 'lead', host, original)
    expect((await editableState(page, 'lead', host))?.hasDiffMarkup).toBe(false)

    await page.close()
  })
})
