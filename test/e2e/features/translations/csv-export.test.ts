import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock } from './../../support/blocks'
import {
  captureDownload,
  openCsvExportDialog,
} from './../../support/translations'
import { parseCsv } from '../../../../src/runtime/editor/features/translations/CsvDialog/csv'
import { parsePo } from '../../../../src/runtime/editor/features/translations/CsvDialog/po'

/**
 * Set up the fixture: open in EN, add a card with a unique source-language
 * title we can locate in the export, then switch to /de.
 */
async function setupCardAndSwitchToDe() {
  const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
  await expect
    .poll(() => withApp(page, (app) => app.state.editMode.value))
    .toBe('editing')

  const cardUuid = await addBlock(page, {
    bundle: 'card',
    fieldName: 'content',
  })
  if (!cardUuid) throw new Error('Failed to add a card.')

  // Read the EN source title via the editable element — the LOREM default the
  // card bundle gives a new block. `RenderedFieldListItem` doesn't expose
  // `.props`; the live DOM is the source of truth.
  const enTitle = await page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    const block = app.blocks.getBlock(uuid)
    if (!block) return ''
    const el = app.directive.findEditableElement('title', {
      type: 'paragraph',
      bundle: block.bundle,
      uuid,
    })
    return el?.textContent?.trim() ?? ''
  }, cardUuid)
  if (!enTitle) throw new Error('Added card has no source title.')

  const deUrl = page.url().replace('/page/1', '/de/page/1')
  await page.goto(deUrl)
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  await page.waitForFunction(
    () => !document.querySelector('[class*="z-init-overlay"]'),
  )
  await expect
    .poll(() => withApp(page, (app) => app.state.editMode.value))
    .toBe('translating')

  return { page, cardUuid, enTitle }
}

/**
 * Regression tests for CSV / PO export.
 *
 * What's under test: the Export tab loads source-language text via the
 * adapter, generates a CSV/PO file via `buildCsv` / `buildPo`, and the file
 * is downloaded to the user. The asserts read the downloaded bytes back and
 * round-trip them through `parseCsv` / `parsePo` — anything that breaks the
 * generation/parse pair (header drift, escaping, key encoding) fails here.
 */
describe('Translations CSV/PO export', async () => {
  await setupEditorE2E()

  test("CSV export contains the card's source title and the DE column for it", async () => {
    const { page, cardUuid, enTitle } = await setupCardAndSwitchToDe()

    await openCsvExportDialog(page)

    const download = await captureDownload(page, () =>
      page.locator('[data-test="translations-csv-export-csv"]').click(),
    )
    expect(download.filename).toMatch(/\.csv$/)

    const parsed = parseCsv(download.content)
    // The current language is DE → Export defaults to that one language only
    // (single-lang format), so we expect either single or multi shape.
    // The DE value either is empty (no translation yet) OR equals the source
    // (mock falls back to source when no separate translation exists). Both
    // mean "no DE-specific text yet" — guard against random other text.
    if (parsed.type === 'single') {
      const row = parsed.rows.find((r) => r.key === `${cardUuid}:title`)
      expect(row, 'card title row should be in the export').toBeDefined()
      expect(row?.source).toBe(enTitle)
      expect([enTitle, '']).toContain(row?.translation)
    } else {
      expect(parsed.languages).toContain('de')
      const row = parsed.rows.find((r) => r.key === `${cardUuid}:title`)
      expect(row, 'card title row should be in the export').toBeDefined()
      expect(row?.source).toBe(enTitle)
      expect([enTitle, '']).toContain(row?.translations.de)
    }

    await page.close()
  })

  test('PO export is well-formed gettext for the DE language', async () => {
    const { page, cardUuid, enTitle } = await setupCardAndSwitchToDe()

    await openCsvExportDialog(page)

    const download = await captureDownload(page, () =>
      page.locator('[data-test="translations-csv-export-po-de"]').click(),
    )
    expect(download.filename).toMatch(/\.po$/)

    const parsed = parsePo(download.content)
    expect(parsed.language).toBe('de')
    const row = parsed.rows.find((r) => r.key === `${cardUuid}:title`)
    expect(row).toBeDefined()
    expect(row?.source).toBe(enTitle)
    // No DE-specific translation yet: either empty or source-as-fallback.
    expect([enTitle, '']).toContain(row?.translation)

    await page.close()
  })
})
