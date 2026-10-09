import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'
import { applyDiff, cancelDiff, editDiff } from './../../support/diff'
import {
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
 * Auto-translate for a field without an editable element of its own.
 *
 * The playground `card` is the fixture: `title` carries `v-blokkli-editable`,
 * `text` is prop-mapped only, so its translation previews through the block's
 * props.
 *
 * **Why the adapter is mocked.** `requestTranslation` is wired to a paid DeepL
 * API in production. The mock adapter, when seeded via
 * `autoTranslateMockEntry()`, returns a deterministic `[<LANG>] <source>`
 * decoration for each item — so this test does NOT hit the real API.
 *
 * The other cases run against Drupal
 * (`test/e2e-drupal/features/translations/auto-translate`); these two follow
 * once the sandbox has a paragraph type with a bound field next to an
 * element-less one.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**. Adding
 * blocks via the adapter works in translating mode (the UI add-list doesn't,
 * but `addBlock` calls `addNewBlock` directly).
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
