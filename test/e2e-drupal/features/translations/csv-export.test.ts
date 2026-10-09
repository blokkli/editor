import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  captureDownload,
  openCsvExportDialog,
} from '../../../e2e/support/translations'
import { emitEvent } from '../../../e2e/support/events'
import { dialog } from '../../../e2e/support/overlays'
import { parseCsv } from '../../../../src/runtime/editor/features/translations/CsvDialog/csv'
import { parsePo } from '../../../../src/runtime/editor/features/translations/CsvDialog/po'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The German translation of the page "Library" (content/nodes/translated.yml),
// and its title, whose German value is the English one.
const PATH_DE = editorPath('/de/bibliothek', 'translated')
const TITLE_KEY = `${seedUuid('paragraph', 'translated-title')}:field_title`
const SOURCE_TITLE = 'Opening hours'

/**
 * Regression tests for CSV / PO export.
 *
 * What's under test: the Export tab loads source-language text via the
 * adapter, generates a CSV/PO file via `buildCsv` / `buildPo`, and the file
 * is downloaded to the user. The asserts read the downloaded bytes back and
 * round-trip them through `parseCsv` / `parsePo` — anything that breaks the
 * generation/parse pair (header drift, escaping, key encoding) fails here.
 *
 * Page lifecycle: one editor page shared, opened directly in /de.
 */
describe('Translations CSV/PO export', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PATH_DE)
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

  test("CSV export contains the title's source text and the DE column for it", async () => {
    await openCsvExportDialog(page)

    const download = await captureDownload(page, () =>
      page.locator('[data-test="translations-csv-export-csv"]').click(),
    )
    expect(download.filename).toMatch(/\.csv$/)

    const parsed = parseCsv(download.content)
    // The current language is DE → Export defaults to that one language only
    // (single-lang format), so we expect either single or multi shape.
    // The DE value either is empty (no translation yet) OR equals the source
    // (the seed gave the translation the source's value). Both mean "no
    // DE-specific text yet" — guard against random other text.
    if (parsed.type === 'single') {
      const row = parsed.rows.find((r) => r.key === TITLE_KEY)
      expect(row, 'title row should be in the export').toBeDefined()
      expect(row?.source).toBe(SOURCE_TITLE)
      expect([SOURCE_TITLE, '']).toContain(row?.translation)
    } else {
      expect(parsed.languages).toContain('de')
      const row = parsed.rows.find((r) => r.key === TITLE_KEY)
      expect(row, 'title row should be in the export').toBeDefined()
      expect(row?.source).toBe(SOURCE_TITLE)
      expect([SOURCE_TITLE, '']).toContain(row?.translations.de)
    }
  })

  test('PO export is well-formed gettext for the DE language', async () => {
    await openCsvExportDialog(page)

    const download = await captureDownload(page, () =>
      page.locator('[data-test="translations-csv-export-po-de"]').click(),
    )
    expect(download.filename).toMatch(/\.po$/)

    const parsed = parsePo(download.content)
    expect(parsed.language).toBe('de')
    const row = parsed.rows.find((r) => r.key === TITLE_KEY)
    expect(row).toBeDefined()
    expect(row?.source).toBe(SOURCE_TITLE)
    // No DE-specific translation yet: either empty or source-as-fallback.
    expect([SOURCE_TITLE, '']).toContain(row?.translation)
  })
})
