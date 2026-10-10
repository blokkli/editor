import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { getHostContext, editorPath, openEditor } from './support/session'
import {
  editableState,
  editableText,
  waitForEditableText,
  openEditableField,
  plaintextEditor,
} from './support/editable'
import {
  runDiffApproval,
  applyFieldDiff,
  cancelDiff,
  applyDiff,
} from './support/diff'
import { undo } from './support/toolbar'
import { openSidebar } from './support/sidebar'
import type { EntityContext } from '../../src/runtime/types'
import { nextMutation } from './support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'

/**
 * Regression test for the DiffApproval DOM-restore bug.
 *
 * When a diff preview is shown, `<ins>`/`<del>` markup is written directly into
 * editable elements via innerHTML. Closing the preview (cancel or apply) must
 * restore the original Vue-managed DOM nodes — otherwise the markup gets stuck
 * and the field stops reacting to subsequent edits (the bug this guards).
 *
 * The scenarios (driven from the sandbox's `test-cases` feature) cover, on the
 * page "Reading" (content/nodes/reading.yml):
 *  - the node's `title` and `field_lead` (bare `v-blokkli-editable`
 *    directives — the lead is the case that originally got stuck),
 *  - its title paragraph's `field_title` (a block — covered via the global
 *    cleanup assertion below).
 *
 * Plus the end-to-end value paths: inline editing still works after a diff
 * cycle, and a real apply commits the proposed value (with undo reverting it).
 *
 * Page lifecycle: one editor page is opened in `beforeAll` with the
 * `test-cases` sidebar already open (the imperative `.test` API only registers
 * once its pane is mounted). Each test reads its own preconditions fresh, so
 * state that builds up between tests (test 3 changes `field_lead`; test 4
 * changes then undoes) doesn't pollute the assertions — every test's
 * "original" is just whatever the current state is.
 */
describe('DiffApproval DOM restore', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let host: EntityContext

  /** Count elements still showing diff-preview markup anywhere in the page. */
  function countDiffActive(): Promise<number> {
    return page.locator('[data-bk-diff-active]').count()
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/reading', 'reading'),
    )
    host = await getHostContext(page)

    // The diff scenarios are driven through the `test-cases` feature, which
    // only registers its `window.__BLOKKLI__.test` API once its sidebar pane is
    // mounted — so open it before any `runDiffApproval`/`applyFieldDiff`.
    await openSidebar(page, 'test-cases')

    // Precondition: both host editables are present on this page.
    const title = await editableState(page, 'title', host)
    const lead = await editableState(page, 'field_lead', host)
    expect(title, 'host "title" editable should exist').not.toBeNull()
    expect(lead, 'host "field_lead" editable should exist').not.toBeNull()
  })

  afterAll(async () => {
    await page.close()
  })

  test('shows diff markup, then restores it on cancel', async () => {
    const done = runDiffApproval(page)

    // Preview shown: the toolbar appears and host fields carry diff markup.
    await page.locator('[data-test="diff-approval-cancel"]').waitFor()
    expect((await editableState(page, 'title', host))?.diffActive).toBe(true)
    expect((await editableState(page, 'field_lead', host))?.diffActive).toBe(
      true,
    )
    expect(await countDiffActive()).toBeGreaterThanOrEqual(2)

    await cancelDiff(page)
    const { applied } = await done
    expect(applied).toBe(false)

    // All preview markup is gone (host fields + the title paragraph).
    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )
    const title = await editableState(page, 'title', host)
    const lead = await editableState(page, 'field_lead', host)
    expect(title?.hasDiffMarkup).toBe(false)
    expect(lead?.hasDiffMarkup).toBe(false)
  })

  test('restores the DOM on apply', async () => {
    const done = runDiffApproval(page)
    await page.locator('[data-test="diff-approval-apply"]').waitFor()
    expect((await editableState(page, 'field_lead', host))?.diffActive).toBe(
      true,
    )

    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)

    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )
    expect((await editableState(page, 'field_lead', host))?.hasDiffMarkup).toBe(
      false,
    )
  })

  test('the lead field still updates on inline edit after a diff-approval cycle', async () => {
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
    await openEditableField(page, 'field_lead')
    const textarea = plaintextEditor(page)
    await textarea.waitFor()
    await textarea.fill(newLead)
    const stored = nextMutation(page, 'pbUpdateHostEntityFieldValue')
    await textarea.press('Enter')
    await stored

    // The field's text reflects the new value and carries no leftover markup.
    await waitForEditableText(page, 'field_lead', host, newLead)
    const lead = await editableState(page, 'field_lead', host)
    expect(lead?.text.trim()).toBe(newLead)
    expect(lead?.hasDiffMarkup).toBe(false)
  })

  test('apply commits the new value, and undo restores the original', async () => {
    const original = await editableText(page, 'field_lead', host)
    const proposed = `${original} — applied by E2E`

    // Apply the diff for real (Drupal stores it on apply).
    const done = applyFieldDiff(page, 'field_lead', proposed)
    await page.locator('[data-test="diff-approval-apply"]').waitFor()
    const stored = nextMutation(page, 'pbUpdateHostEntityFieldValue')
    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)
    expect((await stored).value).toBe(proposed)

    // The field now shows the committed value, with no leftover diff markup.
    await waitForEditableText(page, 'field_lead', host, proposed)
    expect((await editableState(page, 'field_lead', host))?.hasDiffMarkup).toBe(
      false,
    )

    // Pressing undo reverts the mutation back to the original value.
    const undone = nextMutation(page, 'pbSetHistoryIndex')
    await undo(page)
    await undone
    await waitForEditableText(page, 'field_lead', host, original)
    expect((await editableState(page, 'field_lead', host))?.hasDiffMarkup).toBe(
      false,
    )
  })
})
