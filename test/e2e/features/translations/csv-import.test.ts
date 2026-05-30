import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock } from './../../support/blocks'
import {
  blockHost,
  editableState,
  waitForEditableText,
} from './../../support/editable'
import { waitForAdapterCall } from './../../support/recorder'
import { dialog } from './../../support/overlays'
import {
  buildPoFixture,
  buildSingleLangCsv,
  openCsvExportDialog,
  switchToCsvImportTab,
  uploadTranslationsFile,
} from './../../support/translations'

/**
 * Set up the fixture: open in EN, add a card, capture its EN title + uuid,
 * then switch to /de. Returns everything the import tests need.
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
  if (!cardUuid) throw new Error('Failed to add card.')

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
 * Regression tests for CSV and PO import.
 *
 * What's under test: parse an uploaded file, compute the diff against current
 * values, present a selection table, then dispatch only the selected rows via
 * `importTranslationsBatched`. The bug class this guards against is
 * "applied items disagree with selected rows" — silent drift, off-by-one in
 * the change set, parser regressions. We assert the DOM updates AND the
 * adapter payload.
 */
describe('Translations CSV/PO import', async () => {
  await setupEditorE2E()

  test('CSV import applies the translation to the editable', async () => {
    const { page, cardUuid, enTitle } = await setupCardAndSwitchToDe()

    const csv = buildSingleLangCsv([
      {
        key: `${cardUuid}:title`,
        source: enTitle,
        translation: 'Karte alpha',
      },
    ])

    await page.locator('[data-test="translations-banner-csv"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
    await switchToCsvImportTab(page)
    await uploadTranslationsFile(page, {
      name: 'translations.csv',
      content: csv,
    })

    // One change row visible — the diff detector picked exactly the change we
    // sent and didn't synthesize extras.
    const rows = page.locator('[data-test="translations-csv-import-row"]')
    await expect.poll(() => rows.count()).toBe(1)

    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const host = await blockHost(page, cardUuid)
    await waitForEditableText(page, 'title', host, 'Karte alpha')
    expect((await editableState(page, 'title', host))?.text.trim()).toBe(
      'Karte alpha',
    )

    const call = await waitForAdapterCall<{
      items: Array<{
        langcode: string
        uuid: string
        fieldName: string
        fieldValue: string
      }>
    }>(page, 'import_translations_batched')
    expect(call.items).toHaveLength(1)
    expect(call.items[0]).toMatchObject({
      langcode: 'de',
      uuid: cardUuid,
      fieldName: 'title',
      fieldValue: 'Karte alpha',
    })

    await page.close()
  })

  test('PO import applies the translation to the editable', async () => {
    const { page, cardUuid, enTitle } = await setupCardAndSwitchToDe()

    const po = buildPoFixture(
      [
        {
          key: `${cardUuid}:title`,
          source: enTitle,
          translation: 'Karte beta',
        },
      ],
      'de',
    )

    await page.locator('[data-test="translations-banner-csv"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
    await switchToCsvImportTab(page)
    await uploadTranslationsFile(page, { name: 'translations.po', content: po })

    await expect
      .poll(() =>
        page.locator('[data-test="translations-csv-import-row"]').count(),
      )
      .toBe(1)

    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const host = await blockHost(page, cardUuid)
    await waitForEditableText(page, 'title', host, 'Karte beta')

    const call = await waitForAdapterCall<{
      items: Array<{
        langcode: string
        uuid: string
        fieldName: string
        fieldValue: string
      }>
    }>(page, 'import_translations_batched')
    expect(call.items).toHaveLength(1)
    expect(call.items[0]).toMatchObject({
      langcode: 'de',
      uuid: cardUuid,
      fieldName: 'title',
      fieldValue: 'Karte beta',
    })

    await page.close()
  })

  test('unchecking a row excludes it from the applied items', async () => {
    // Two cards → two import rows. We uncheck the first; only the second
    // should make it into the apply payload AND the DOM.
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('editing')
    const uuidA = await addBlock(page, { bundle: 'card', fieldName: 'content' })
    const uuidB = await addBlock(page, { bundle: 'card', fieldName: 'content' })
    if (!uuidA || !uuidB) throw new Error('Failed to add cards.')

    const titles = await page.evaluate(
      ([a, b]) => {
        const app = window.__BLOKKLI__!.app!
        const get = (u: string) => {
          const block = app.blocks.getBlock(u)
          if (!block) return ''
          const el = app.directive.findEditableElement('title', {
            type: 'paragraph',
            bundle: block.bundle,
            uuid: u,
          })
          return el?.textContent?.trim() ?? ''
        }
        return { a: get(a), b: get(b) }
      },
      [uuidA, uuidB] as const,
    )
    if (!titles.a || !titles.b) throw new Error('Cards missing source titles.')

    const deUrl = page.url().replace('/page/1', '/de/page/1')
    await page.goto(deUrl)
    await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
    await page.waitForFunction(
      () => !document.querySelector('[class*="z-init-overlay"]'),
    )
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    const csv = buildSingleLangCsv([
      { key: `${uuidA}:title`, source: titles.a, translation: 'Karte A' },
      { key: `${uuidB}:title`, source: titles.b, translation: 'Karte B' },
    ])

    await page.locator('[data-test="translations-banner-csv"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
    await switchToCsvImportTab(page)
    await uploadTranslationsFile(page, {
      name: 'translations.csv',
      content: csv,
    })

    await expect
      .poll(() =>
        page.locator('[data-test="translations-csv-import-row"]').count(),
      )
      .toBe(2)

    // Uncheck the row keyed by card A.
    const rowA = page.locator(
      `[data-test="translations-csv-import-row"][data-test-key="${uuidA}:title"]`,
    )
    await rowA.locator('input[type="checkbox"]').click()

    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const hostA = await blockHost(page, uuidA)
    const hostB = await blockHost(page, uuidB)
    await waitForEditableText(page, 'title', hostB, 'Karte B')
    const stateA = await editableState(page, 'title', hostA)
    expect(stateA?.text.trim()).toBe(titles.a) // unchanged

    const call = await waitForAdapterCall<{
      items: Array<{ uuid: string; fieldName: string; fieldValue: string }>
    }>(page, 'import_translations_batched')
    expect(call.items).toHaveLength(1)
    expect(call.items[0]).toMatchObject({
      uuid: uuidB,
      fieldName: 'title',
      fieldValue: 'Karte B',
    })

    await page.close()
  })
})
