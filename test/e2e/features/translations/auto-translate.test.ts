import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'
import { applyDiff, cancelDiff, editDiff } from './../../support/diff'
import {
  editableState,
  blockHost,
  plaintextEditor,
  editableOverlay,
} from './../../support/editable'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import {
  addCardWithSourceTitle,
  autoTranslateMockEntry,
} from './../../support/translations'

type ImportTranslationsArgs = {
  items: Array<{
    langcode: string
    uuid: string
    fieldName: string
    fieldValue: string
  }>
}

/**
 * Source value of a card's `text` field. It is prop-mapped but not rendered
 * with the editable directive, so it resolves through the props-aware read
 * path (there is no DOM element to read from).
 */
async function readCardTextValue(page: Page, uuid: string): Promise<string> {
  return page.evaluate(
    (host) =>
      window.__BLOKKLI__!.app!.fieldValue.readFieldValue('text', host)?.value ??
      '',
    await blockHost(page, uuid),
  )
}

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

  test('a manually edited translation is persisted instead of the suggestion', async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)
    const host = await blockHost(page, uuid)

    await emitEvent(page, 'select', uuid)
    await clearAdapterCalls(page)

    await page
      .locator('[data-test="plugin-item-action-auto-translate"]')
      .click()
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    // The card's `title` item is the active unit — `text` sorts after it
    // (having no field element, it keeps its source position).
    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })

    // Seeded with the translated suggestion, not the current field value.
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe(`[DE] ${sourceTitle}`)

    await plaintextEditor(page).fill('Hand-revised translated title')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    await applyDiff(page)

    // The batch import must carry the revision (not the suggestion) with the
    // target langcode.
    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === uuid && i.fieldName === 'title',
    )
    expect(item).toBeDefined()
    expect(item!.fieldValue).toBe('Hand-revised translated title')
    expect(item!.langcode).toBe('de')

    // The DOM shows the revision after DiffApproval unmounts.
    await expect
      .poll(async () => (await editableState(page, 'title', host))?.text.trim())
      .toBe('Hand-revised translated title')
    expect(await page.locator('[data-bk-diff-active]').count()).toBe(0)
  })

  test('every translated field gets a visible highlight', async () => {
    const { uuid } = await addCardWithSourceTitle(page)

    const sourceText = await readCardTextValue(page, uuid)
    expect(sourceText.length).toBeGreaterThan(0)

    await emitEvent(page, 'select', uuid)

    await page
      .locator('[data-test="plugin-item-action-auto-translate"]')
      .click()
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    // Both card fields (title + text) are translated, so two approval units
    // exist...
    const items = page.locator('[data-test="diff-approval-highlight-item"]')
    await expect.poll(() => items.count()).toBe(2)

    // ...and both must be visible in the canvas. A unit whose highlight can't
    // be placed is still counted in the toolbar, so hiding it leaves the user
    // approving something they cannot see.
    await expect
      .poll(() =>
        page
          .locator('[data-test="diff-approval-highlight-item"]:visible')
          .count(),
      )
      .toBe(2)

    // The `text` highlight anchors to the block element as a fallback.
    expect(
      await page
        .locator(
          '[data-test="diff-approval-highlight-item"][data-test-fallback="true"]:visible',
        )
        .count(),
    ).toBe(1)

    // The element-less field previews through the block's props: while the
    // unit is accepted (the default), the card renders the proposed
    // translation as its real value (no diff markup is possible via a prop).
    const block = page.locator(`[data-bk-uuid="${uuid}"]`)
    await expect.poll(() => block.textContent()).toContain(`[DE] ${sourceText}`)

    // Rejecting the unit restores the original value reactively.
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Space')
    await expect
      .poll(async () =>
        (await block.textContent())?.includes(`[DE] ${sourceText}`),
      )
      .toBe(false)
    expect(await block.textContent()).toContain(sourceText)

    await cancelDiff(page)

    // Cancel restores everything — the title's diff markup (DOM strategy) and
    // the text's prop override (props strategy) are both gone.
    await expect
      .poll(async () => (await block.textContent())?.includes('[DE]'))
      .toBe(false)
  })

  test('a translation for a field without an editable element can be edited', async () => {
    const { uuid } = await addCardWithSourceTitle(page)

    const sourceText = await readCardTextValue(page, uuid)
    expect(sourceText.length).toBeGreaterThan(0)

    await emitEvent(page, 'select', uuid)
    await clearAdapterCalls(page)

    await page
      .locator('[data-test="plugin-item-action-auto-translate"]')
      .click()
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    // Activate the element-less `text` unit (second in reading order) and
    // open the manual edit overlay for it.
    await page.keyboard.press('ArrowDown')
    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })

    // Seeded with the translated suggestion.
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe(`[DE] ${sourceText}`)

    await plaintextEditor(page).fill('Hand-revised element-less text')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    // The revision previews through the block's props.
    const block = page.locator(`[data-bk-uuid="${uuid}"]`)
    await expect
      .poll(() => block.textContent())
      .toContain('Hand-revised element-less text')

    await applyDiff(page)

    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === uuid && i.fieldName === 'text',
    )
    expect(item).toBeDefined()
    expect(item!.fieldValue).toBe('Hand-revised element-less text')
    expect(item!.langcode).toBe('de')
  })
})
