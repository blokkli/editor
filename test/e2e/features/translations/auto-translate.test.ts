import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'
import { applyDiff } from './../../support/diff'
import { editableState, blockHost } from './../../support/editable'
import {
  addCardWithSourceTitle,
  autoTranslateMockEntry,
} from './../../support/translations'

/**
 * Regression test for the auto-translate DOM-staleness bug.
 *
 * When a user accepts an auto-translation in the DiffApproval preview, the
 * mutation persists the new value via `importTranslationsBatched`, then
 * DiffApproval unmounts — and each `Highlight/Item` re-inserts the original
 * Vue-managed child nodes captured before `setDiffHtml` was applied. Those
 * captured nodes hold the PRE-translation text, so the DOM ends up showing the
 * old text even though the underlying state was updated correctly.
 *
 * What this guards: after the user clicks "Apply", the editable's DOM shows
 * the new translated value (not the original) and carries no leftover diff
 * markup.
 *
 * **Why the adapter is mocked.** `requestTranslation` is wired to a paid DeepL
 * API in production. Running E2E against the real endpoint would burn credit
 * on every run. The mock adapter, when seeded via `autoTranslateMockEntry()`,
 * returns a deterministic `[<LANG>] <source>` decoration for each item — so
 * this test does NOT hit the real API.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**. Adding
 * blocks via the adapter works in translating mode (the UI add-list doesn't,
 * but `addBlock` calls `addNewBlock` directly), so we skip the ~2.3s EN→DE
 * goto that the original setup paid.
 */
describe('Auto-translate', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true', {
      localStorage: autoTranslateMockEntry(),
    })
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('translating an added card updates the editable DOM after Apply', async () => {
    const { uuid: cardUuid } = await addCardWithSourceTitle(page)

    const host = await blockHost(page, cardUuid)
    const before = await editableState(page, 'title', host)
    expect(before, 'card title editable should exist').not.toBeNull()
    const originalText = before!.text.trim()
    expect(originalText.length).toBeGreaterThan(0)
    expect(originalText).not.toContain('[DE]')
    expect(before!.hasDiffMarkup).toBe(false)
    expect(before!.diffActive).toBe(false)

    // Select the card so AutoTranslate's `selection.uuids` filter picks it up.
    await emitEvent(page, 'select', cardUuid)

    // The PluginItemAction renders with `data-test="plugin-item-action-<id>"`.
    const autoTranslateButton = page.locator(
      '[data-test="plugin-item-action-auto-translate"]',
    )
    await autoTranslateButton.waitFor({ state: 'visible' })
    await autoTranslateButton.click()

    // DiffApproval mounts once requestTranslation resolves — the toolbar's
    // Apply button is the stable readiness signal.
    const applyButton = page.locator('[data-test="diff-approval-apply"]')
    await applyButton.waitFor({ state: 'visible' })

    // The mock returns `[DE] <source>` for each item; the card's title field
    // should now have its preview overlay applied.
    expect((await editableState(page, 'title', host))?.diffActive).toBe(true)

    await applyDiff(page)

    // After apply, all diff-preview markers should be gone editor-wide.
    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )

    // THE BUG: after DiffApproval unmounts, each Item re-inserts the originally
    // captured Vue-managed nodes — which carried the PRE-translation text. So
    // the DOM ends up showing the old text instead of the newly-applied
    // `[DE] <source>` value.
    await expect
      .poll(async () => {
        const state = await editableState(page, 'title', host)
        return state?.text.trim() ?? ''
      })
      .toContain('[DE]')

    const after = await editableState(page, 'title', host)
    expect(after?.hasDiffMarkup).toBe(false)
    expect(after?.diffActive).toBe(false)
    // Sanity: the applied text really is the mock decoration of the source —
    // not an unrelated value that happened to contain '[DE]'.
    expect(after?.text.trim().startsWith('[DE]')).toBe(true)
  })
})
