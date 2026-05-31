import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  blockHost,
  editableState,
  waitForEditableText,
} from './../../support/editable'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { dialog } from './../../support/overlays'
import {
  addCardWithSourceTitle,
  buildPoFixture,
  buildSingleLangCsv,
  switchToCsvImportTab,
  uploadTranslationsFile,
} from './../../support/translations'

/**
 * Regression tests for CSV and PO import.
 *
 * What's under test: parse an uploaded file, compute the diff against current
 * values, present a selection table, then dispatch only the selected rows via
 * `importTranslationsBatched`. The bug class this guards against is
 * "applied items disagree with selected rows" — silent drift, off-by-one in
 * the change set, parser regressions. We assert the DOM updates AND the
 * adapter payload.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de** (the
 * comment "adding blocks is forbidden in translating mode" describes the
 * UI add-list — the adapter's `addNewBlock` works fine in any language).
 * Skipping the EN→DE navigation saves ~2.3s per test that an EN-then-goto
 * setup paid waiting for the post-goto hydration + init-overlay teardown.
 *
 * `beforeEach` only clears the adapter recorder; mock state accumulates
 * across tests (each test's CSV references its own uuid so the diff
 * detector only ever returns the test's own rows).
 */

describe('Translations CSV/PO import', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true')
    // The editor's `loadState` resolves the edit mode before hydration
    // finishes; `openEditor` already waits for both, so by the time it
    // returns the mode is settled.
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  beforeEach(async () => {
    await clearAdapterCalls(page)
  })

  test('CSV import applies the translation to the editable', async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)

    const csv = buildSingleLangCsv([
      { key: `${uuid}:title`, source: sourceTitle, translation: 'Karte alpha' },
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

    const host = await blockHost(page, uuid)
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
      uuid,
      fieldName: 'title',
      fieldValue: 'Karte alpha',
    })
  })

  test('PO import applies the translation to the editable', async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)

    const po = buildPoFixture(
      [
        {
          key: `${uuid}:title`,
          source: sourceTitle,
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

    const host = await blockHost(page, uuid)
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
      uuid,
      fieldName: 'title',
      fieldValue: 'Karte beta',
    })
  })

  test('unchecking a row excludes it from the applied items', async () => {
    // Two cards → two import rows. We uncheck the first; only the second
    // should make it into the apply payload AND the DOM.
    const a = await addCardWithSourceTitle(page)
    const b = await addCardWithSourceTitle(page)

    const csv = buildSingleLangCsv([
      { key: `${a.uuid}:title`, source: a.sourceTitle, translation: 'Karte A' },
      { key: `${b.uuid}:title`, source: b.sourceTitle, translation: 'Karte B' },
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
      `[data-test="translations-csv-import-row"][data-test-key="${a.uuid}:title"]`,
    )
    await rowA
      .locator('[data-test="translations-csv-import-row-checkbox"]')
      .click()

    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await waitForEditableText(page, 'title', hostB, 'Karte B')
    const stateA = await editableState(page, 'title', hostA)
    expect(stateA?.text.trim()).toBe(a.sourceTitle) // unchanged

    const call = await waitForAdapterCall<{
      items: Array<{ uuid: string; fieldName: string; fieldValue: string }>
    }>(page, 'import_translations_batched')
    expect(call.items).toHaveLength(1)
    expect(call.items[0]).toMatchObject({
      uuid: b.uuid,
      fieldName: 'title',
      fieldValue: 'Karte B',
    })
  })
})
