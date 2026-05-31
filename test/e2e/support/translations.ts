import type { Page } from 'playwright-core'
import {
  TRANSLATION_MOCK_KEY,
  type AutoTranslateMockConfig,
} from '../../../playground/app/mock/translationOverride'
import {
  OUTDATED_TRANSLATIONS_KEY,
  type OutdatedTranslationsOverride,
} from '../../../playground/app/mock/outdatedTranslationsOverride'
import {
  buildCsv,
  type CsvRow,
} from '../../../src/runtime/editor/features/translations/CsvDialog/csv'
import { buildPo } from '../../../src/runtime/editor/features/translations/CsvDialog/po'
import { addBlock } from './blocks'
import { blockHost, editableText } from './editable'
import { openAppMenu, appMenuButton } from './menu'
import { dialog } from './overlays'

/**
 * Add a card to `content` and read its source-language `title` (the LOREM
 * default the `card` bundle gives a new block). Tests that drive a
 * translation flow need both — the uuid keys the CSV/PO row, and the title
 * goes into the `source` column.
 *
 * Works whether the editor is open in EN or DE: in DE the displayed title
 * falls back to the EN source when no DE translation exists yet.
 */
export async function addCardWithSourceTitle(
  page: Page,
): Promise<{ uuid: string; sourceTitle: string }> {
  const uuid = await addBlock(page, { bundle: 'card', fieldName: 'content' })
  if (!uuid) throw new Error('Failed to add card.')
  const host = await blockHost(page, uuid)
  const sourceTitle = await editableText(page, 'title', host)
  if (!sourceTitle) throw new Error('Added card has no source title.')
  return { uuid, sourceTitle }
}

/**
 * Build the `openEditor({ localStorage })` entry that puts the mock adapter's
 * `requestTranslation` into deterministic-mock mode. Specs MUST pass this when
 * exercising the auto-translate flow — otherwise the adapter falls through to
 * the real `/api/translate` endpoint (paid DeepL).
 *
 * Default behaviour: each item is returned as `[<TARGET-LANG>] <source text>`,
 * making the rendered DOM trivially assertable (`includes('[DE] ')`). Pass
 * `prefix`/`suffix` to use your own marker.
 *
 * @example
 * const page = await openEditor(
 *   '/de/page/1?blokkliEditing=1&testing=true',
 *   { localStorage: autoTranslateMockEntry() },
 * )
 */
export function autoTranslateMockEntry(
  config: AutoTranslateMockConfig = {},
): Record<string, string> {
  return { [TRANSLATION_MOCK_KEY]: JSON.stringify(config) }
}

/**
 * Build the `openEditor({ localStorage })` entry that marks the given block
 * uuids as having outdated translations in specific languages. Lets a spec
 * reach the Banner's outdated state without driving the full
 * add → translate → re-edit UI loop. See `outdatedTranslationsOverride.ts`.
 *
 * @example
 * const page = await openEditor('/de/page/1?...', {
 *   localStorage: outdatedTranslationsEntry({ [cardUuid]: ['de'] }),
 * })
 */
export function outdatedTranslationsEntry(
  map: OutdatedTranslationsOverride,
): Record<string, string> {
  return { [OUTDATED_TRANSLATIONS_KEY]: JSON.stringify(map) }
}

/**
 * Open the batch-translate dialog via the app menu and wait until its fields
 * table is rendered (the loading spinner has resolved).
 */
export async function openTranslateDialog(page: Page): Promise<void> {
  await openAppMenu(page)
  await appMenuButton(page, 'translations').click()
  await dialog(page, 'translations-translate').waitFor({ state: 'visible' })
  await page
    .locator('[data-test="translations-batch-fields"]')
    .waitFor({ state: 'visible' })
}

/**
 * Open the CSV/PO import-export dialog by clicking the Banner's Import/export
 * button (translating mode only) and wait until the Export tab's loaded data
 * is visible. The dialog opens in `export` mode by default — for import,
 * follow up with `switchToCsvImportTab`.
 */
export async function openCsvExportDialog(page: Page): Promise<void> {
  await page.locator('[data-test="translations-banner-csv"]').click()
  await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
  await page
    .locator('[data-test="translations-csv-export-loaded"]')
    .waitFor({ state: 'visible' })
}

/**
 * Switch the open CsvDialog to the Import tab. The Import component's
 * `onMounted` calls `triggerFileDialog()` to auto-open the OS file picker —
 * we register a one-shot no-op `filechooser` listener BEFORE the tab click so
 * Playwright absorbs that event instead of hanging. Tests then drive the file
 * input directly via `uploadTranslationsFile`.
 */
export async function switchToCsvImportTab(page: Page): Promise<void> {
  // Absorb the auto-opened file picker. `page.once('filechooser', …)` returns
  // immediately; the listener fires asynchronously when the tab click triggers
  // the Import component's mount.
  page.once('filechooser', () => {
    // no-op — files are set directly via setInputFiles
  })
  await dialog(page, 'translations-csv')
    .locator('[data-test-tab="import"]')
    .click()
}

export interface TranslationsFile {
  /** Filename — must end in `.csv` or `.po` (the Import component filters). */
  name: string
  /** File body as a string. */
  content: string
  /** MIME type; defaults to `text/csv` for `.csv` and `text/x-gettext` for `.po`. */
  mimeType?: string
}

/**
 * Upload a CSV or PO file to the open Import tab's hidden file input. Waits
 * until either the changes table (`-changes`) or the no-changes message
 * (`-no-changes`) becomes visible — i.e. the import has been processed.
 */
export async function uploadTranslationsFile(
  page: Page,
  file: TranslationsFile,
): Promise<void> {
  const mimeType =
    file.mimeType ?? (file.name.endsWith('.po') ? 'text/x-gettext' : 'text/csv')
  await page
    .locator('[data-test="translations-csv-import-file"]')
    .setInputFiles({
      name: file.name,
      mimeType,
      buffer: Buffer.from(file.content, 'utf-8'),
    })
  // Wait until processing has completed (changes table or no-changes message).
  await page
    .locator(
      '[data-test="translations-csv-import-changes"], [data-test="translations-csv-import-no-changes"]',
    )
    .first()
    .waitFor({ state: 'visible' })
}

export interface CapturedDownload {
  filename: string
  content: string
}

/**
 * Trigger a download and return its filename + utf-8 content. Wraps
 * `page.waitForEvent('download')` plus reading the temp file Playwright
 * downloads to. The trigger function must initiate the download (e.g. click
 * the download button); the listener is registered before it runs.
 */
export async function captureDownload(
  page: Page,
  trigger: () => Promise<void>,
): Promise<CapturedDownload> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    trigger(),
  ])
  const path = await download.path()
  if (!path) {
    throw new Error(
      `Download for "${download.suggestedFilename()}" returned no path — Playwright failed to save the file.`,
    )
  }
  const fs = await import('node:fs/promises')
  const content = await fs.readFile(path, 'utf-8')
  return { filename: download.suggestedFilename(), content }
}

/**
 * Build a single-language CSV body matching the editor's expected format:
 * `key,source,translation` header. Routes through the runtime's
 * `buildCsv` (Papa.unparse) so the bytes match what the Export component
 * generates / what the Import component parses.
 */
export function buildSingleLangCsv(rows: CsvRow[]): string {
  return buildCsv(rows)
}

/**
 * Build a PO file body via the runtime's `buildPo` (the same helper Export
 * uses) — guarantees the import test exercises the EXACT format the editor
 * round-trips. `Language` header comes from `langcode`.
 */
export function buildPoFixture(rows: CsvRow[], langcode: string): string {
  return buildPo(rows, langcode)
}
