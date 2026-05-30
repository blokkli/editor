import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'
import { applyDiff } from './../../support/diff'
import { editableState, blockHost } from './../../support/editable'
import { addBlock } from './../../support/blocks'
import { autoTranslateMockEntry } from './../../support/translations'

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
 * **Why a fresh card is added.** The test owns its block: it adds a card in
 * EN editing mode (with the bundle's default LOREM title/text), then switches
 * the URL to `/de` so the same persisted edit-state surfaces in translating
 * mode. The new card has no DE translation yet, so its rendered text is the
 * EN source — the auto-translate diff must replace that text with `[DE] …`.
 */
describe('Auto-translate', async () => {
  await setupEditorE2E()

  test('translating an added card updates the editable DOM after Apply', async () => {
    // Open in EN editing mode first — adding blocks is forbidden in translating
    // mode, so we set up the fixture here, then switch the URL to /de below.
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true', {
      localStorage: autoTranslateMockEntry(),
    })

    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('editing')

    // Add a fresh card to the host `content` field. Default values give it a
    // translatable `title` (LOREM_TITLE), which is what we'll auto-translate.
    const cardUuid = await addBlock(page, {
      bundle: 'card',
      fieldName: 'content',
    })
    if (!cardUuid) {
      throw new Error('Failed to add a card block.')
    }

    // Navigate to the German URL of the same page — same browser context, so
    // the mock's edit-state localStorage (keyed by entity uuid, not language)
    // carries the new card across the reload.
    const enUrl = page.url()
    const deUrl = enUrl.replace('/page/1', '/de/page/1')
    await page.goto(deUrl)
    await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
    await page.waitForFunction(
      () => !document.querySelector('[class*="z-init-overlay"]'),
    )

    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    // The card survived the navigation and is registered in the editor.
    const stillExists = await page.evaluate(
      (uuid) => Boolean(window.__BLOKKLI__!.app!.blocks.getBlock(uuid)),
      cardUuid,
    )
    expect(stillExists, 'added card should exist after switching to /de').toBe(
      true,
    )

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
    await expect
      .poll(() => withApp(page, (app) => app.selection.uuids.value.length))
      .toBe(1)

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

    await page.close()
  })
})
