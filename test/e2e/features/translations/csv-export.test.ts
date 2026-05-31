import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  addCardWithSourceTitle,
  captureDownload,
  openCsvExportDialog,
} from './../../support/translations'
import { emitEvent } from './../../support/events'
import { dialog } from './../../support/overlays'
import { parseCsv } from '../../../../src/runtime/editor/features/translations/CsvDialog/csv'
import { parsePo } from '../../../../src/runtime/editor/features/translations/CsvDialog/po'

/**
 * Regression tests for CSV / PO export.
 *
 * What's under test: the Export tab loads source-language text via the
 * adapter, generates a CSV/PO file via `buildCsv` / `buildPo`, and the file
 * is downloaded to the user. The asserts read the downloaded bytes back and
 * round-trip them through `parseCsv` / `parsePo` — anything that breaks the
 * generation/parse pair (header drift, escaping, key encoding) fails here.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**.
 * Adding blocks via the adapter works in translating mode (the UI add-list
 * doesn't, but `addBlock` calls `addNewBlock` directly), so we skip the
 * ~2.3s EN→DE goto + hydration the file used to pay per test.
 */
describe('Translations CSV/PO export', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true')
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // The download triggers don't auto-close the dialog. Close it so the next
    // test's banner-csv click isn't intercepted by the lingering modal.
    if (await dialog(page, 'translations-csv').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })
    }
  })

  test("CSV export contains the card's source title and the DE column for it", async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)

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
      const row = parsed.rows.find((r) => r.key === `${uuid}:title`)
      expect(row, 'card title row should be in the export').toBeDefined()
      expect(row?.source).toBe(sourceTitle)
      expect([sourceTitle, '']).toContain(row?.translation)
    } else {
      expect(parsed.languages).toContain('de')
      const row = parsed.rows.find((r) => r.key === `${uuid}:title`)
      expect(row, 'card title row should be in the export').toBeDefined()
      expect(row?.source).toBe(sourceTitle)
      expect([sourceTitle, '']).toContain(row?.translations.de)
    }
  })

  test('PO export is well-formed gettext for the DE language', async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)

    await openCsvExportDialog(page)

    const download = await captureDownload(page, () =>
      page.locator('[data-test="translations-csv-export-po-de"]').click(),
    )
    expect(download.filename).toMatch(/\.po$/)

    const parsed = parsePo(download.content)
    expect(parsed.language).toBe('de')
    const row = parsed.rows.find((r) => r.key === `${uuid}:title`)
    expect(row).toBeDefined()
    expect(row?.source).toBe(sourceTitle)
    // No DE-specific translation yet: either empty or source-as-fallback.
    expect([sourceTitle, '']).toContain(row?.translation)
  })
})
