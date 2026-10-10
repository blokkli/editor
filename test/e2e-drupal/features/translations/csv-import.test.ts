import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  waitForEditorReady,
  editorPath,
  openEditor,
  revertAllChanges,
} from '../../support/session'
import {
  blockHost,
  editableState,
  waitForEditableText,
} from '../../support/editable'
import { dialog } from '../../support/overlays'
import {
  buildPoFixture,
  buildSingleLangCsv,
  switchToCsvImportTab,
  uploadTranslationsFile,
} from '../../support/translations'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

// The English-only titles of the page "Notices" (content/nodes/notices.yml).
const FIRST = {
  uuid: seedUuid('paragraph', 'notices-first-title'),
  sourceTitle: 'First notice',
}
const SECOND = {
  uuid: seedUuid('paragraph', 'notices-second-title'),
  sourceTitle: 'Second notice',
}

/**
 * Regression tests for CSV and PO import.
 *
 * What's under test: parse an uploaded file, compute the diff against current
 * values, present a selection table, then dispatch only the selected rows via
 * `importTranslationsBatched` (`pbBulkTranslateFieldValues`). The bug class
 * this guards against is "applied items disagree with selected rows" — silent
 * drift, off-by-one in the change set, parser regressions. We assert the DOM
 * updates AND the mutation's variables.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**: the
 * German translation of the page "Notices", whose titles have no German
 * value. `afterEach` discards the edit state (`revertAllChanges`), so every
 * test starts with untranslated titles.
 */

describe('Translations CSV/PO import', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/mitteilungen', 'notices'),
    )
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await revertAllChanges(page)
  })

  test('CSV import applies the translation to the editable', async () => {
    const csv = buildSingleLangCsv([
      {
        key: `${FIRST.uuid}:field_title`,
        source: FIRST.sourceTitle,
        translation: 'Mitteilung alpha',
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

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const variables = await imported
    expect(variables.items).toHaveLength(1)
    expect(variables.items[0]).toMatchObject({
      langcode: 'de',
      uuid: FIRST.uuid,
      name: 'field_title',
      value: 'Mitteilung alpha',
    })

    const host = await blockHost(page, FIRST.uuid)
    await waitForEditableText(page, 'field_title', host, 'Mitteilung alpha')
    expect((await editableState(page, 'field_title', host))?.text.trim()).toBe(
      'Mitteilung alpha',
    )

    // Drupal stored it.
    await page.reload()
    await waitForEditorReady(page)
    await waitForEditableText(page, 'field_title', host, 'Mitteilung alpha')
  })

  test('PO import applies the translation to the editable', async () => {
    const po = buildPoFixture(
      [
        {
          key: `${SECOND.uuid}:field_title`,
          source: SECOND.sourceTitle,
          translation: 'Mitteilung beta',
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

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const variables = await imported
    expect(variables.items).toHaveLength(1)
    expect(variables.items[0]).toMatchObject({
      langcode: 'de',
      uuid: SECOND.uuid,
      name: 'field_title',
      value: 'Mitteilung beta',
    })

    const host = await blockHost(page, SECOND.uuid)
    await waitForEditableText(page, 'field_title', host, 'Mitteilung beta')
  })

  test('unchecking a row excludes it from the applied items', async () => {
    // Two titles → two import rows. We uncheck the first; only the second
    // should make it into the apply payload AND the DOM.
    const csv = buildSingleLangCsv([
      {
        key: `${FIRST.uuid}:field_title`,
        source: FIRST.sourceTitle,
        translation: 'Mitteilung A',
      },
      {
        key: `${SECOND.uuid}:field_title`,
        source: SECOND.sourceTitle,
        translation: 'Mitteilung B',
      },
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

    // Uncheck the first title's row.
    const rowA = page.locator(
      `[data-test="translations-csv-import-row"][data-test-key="${FIRST.uuid}:field_title"]`,
    )
    await rowA
      .locator('[data-test="translations-csv-import-row-checkbox"]')
      .click()

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })

    const variables = await imported
    expect(variables.items).toHaveLength(1)
    expect(variables.items[0]).toMatchObject({
      uuid: SECOND.uuid,
      name: 'field_title',
      value: 'Mitteilung B',
    })

    const hostA = await blockHost(page, FIRST.uuid)
    const hostB = await blockHost(page, SECOND.uuid)
    await waitForEditableText(page, 'field_title', hostB, 'Mitteilung B')
    const stateA = await editableState(page, 'field_title', hostA)
    expect(stateA?.text.trim()).toBe(FIRST.sourceTitle) // unchanged
  })
})
