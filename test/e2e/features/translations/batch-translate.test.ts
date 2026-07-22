import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import type { Page, Locator } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  blockHost,
  editableState,
  editableFrame,
  setFrameValue,
} from './../../support/editable'
import { addBlock } from './../../support/blocks'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { dialog } from './../../support/overlays'
import {
  addCardWithSourceTitle,
  autoTranslateMockEntry,
  openTranslateDialog,
} from './../../support/translations'

type ImportTranslationsArgs = {
  items: Array<{
    langcode: string
    uuid: string
    fieldName: string
    fieldValue: string
  }>
}

/** The table row for a given `uuid:fieldName` key. */
function batchRow(page: Page, key: string): Locator {
  return page.locator(
    `[data-test="translations-batch-row"][data-test-key="${key}"]`,
  )
}

/** Open the inline editor for the given row and wait until it's rendered. */
async function openRowEditor(page: Page, key: string): Promise<void> {
  await batchRow(page, key)
    .locator('[data-test="translations-batch-edit"]')
    .click()
  await page
    .locator('[data-test="translations-batch-editor"]')
    .waitFor({ state: 'visible' })
}

/**
 * Regression tests for the batch-translate flow (TranslateDialog).
 *
 * What's under test: load source texts → request translations from the mocked
 * service → apply selected ones via `importTranslationsBatched`. The apply is
 * the load-bearing operation — its payload determines what actually changes,
 * and the DOM update afterwards is the user-visible result.
 *
 * Why both assertions: a shallow test (just adapter call OR just DOM) misses
 * the failure modes that matter — sending the wrong items, or sending right
 * items that fail to render. We assert both.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de** with the
 * auto-translate mock seeded. Skipping the EN→DE goto saves ~2.3s per test.
 * `beforeEach` clears the adapter recorder. Each test adds its own two cards
 * via `addCardWithSourceTitle`; prior tests' cards remain in mock state but
 * don't interfere — each test's adapter-call assertion is keyed on its own
 * uuids.
 */
describe('Batch translate (TranslateDialog)', async () => {
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

  beforeEach(async () => {
    await clearAdapterCalls(page)
  })

  test("requests, applies, and mutates all added cards' editables", async () => {
    const a = await addCardWithSourceTitle(page)
    const b = await addCardWithSourceTitle(page)

    await openTranslateDialog(page)

    const rows = page.locator('[data-test="translations-batch-row"]')
    // Sanity: at least the two added cards' titles are in the table (plus the
    // host's translatable fields). We assert a lower bound, not an exact count,
    // because the host page brings its own translatable fields.
    expect(await rows.count()).toBeGreaterThanOrEqual(2)

    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    expect(await applyButton.isDisabled()).toBe(true)
    await requestButton.click()
    // Apply unlocks once requestTranslation resolves.
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // BOTH added cards' title editables should now show the `[DE] …` mock
    // translation. Wait on each one — the mutation patches asynchronously.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ua, ub }) => {
        const app = window.__BLOKKLI__!.app!
        const ea = app.directive.findEditableElement('title', JSON.parse(ua))
        const eb = app.directive.findEditableElement('title', JSON.parse(ub))
        return (
          !!ea?.textContent?.includes('[DE]') &&
          !!eb?.textContent?.includes('[DE]')
        )
      },
      { ua: JSON.stringify(hostA), ub: JSON.stringify(hostB) },
    )

    // Both cards' applied state matches the mock decoration and carries no
    // residual diff markup.
    const stateA = await editableState(page, 'title', hostA)
    const stateB = await editableState(page, 'title', hostB)
    expect(stateA?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateB?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateA?.hasDiffMarkup).toBe(false)
    expect(stateB?.hasDiffMarkup).toBe(false)

    // Adapter payload: langcode is DE, items list includes BOTH cards' title
    // field. A regression that drops one card from the apply would fail here.
    const call = await waitForAdapterCall<{
      items: Array<{ langcode: string; uuid: string; fieldName: string }>
      markUpToDate?: boolean
    }>(page, 'import_translations_batched')
    const langs = new Set(call.items.map((i) => i.langcode))
    expect([...langs]).toEqual(['de'])
    const sentUuids = new Set(
      call.items.filter((i) => i.fieldName === 'title').map((i) => i.uuid),
    )
    expect(sentUuids.has(a.uuid)).toBe(true)
    expect(sentUuids.has(b.uuid)).toBe(true)
  })

  test('applying with one row unchecked excludes that row from the apply', async () => {
    const a = await addCardWithSourceTitle(page)
    const b = await addCardWithSourceTitle(page)

    await openTranslateDialog(page)
    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    await requestButton.click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    // Uncheck the row keyed by cardA's title via its `data-test-key` attribute.
    const rowA = page.locator(
      `[data-test="translations-batch-row"][data-test-key="${a.uuid}:title"]`,
    )
    await rowA.waitFor({ state: 'visible' })
    await rowA.locator('[data-test="translations-batch-row-checkbox"]').click()

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Card B has been translated; Card A still shows its original EN title.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ub }) => {
        const app = window.__BLOKKLI__!.app!
        const eb = app.directive.findEditableElement('title', JSON.parse(ub))
        return !!eb?.textContent?.includes('[DE]')
      },
      { ub: JSON.stringify(hostB) },
    )

    const titleA =
      (await editableState(page, 'title', hostA))?.text.trim() ?? ''
    expect(titleA).not.toContain('[DE]')

    // Adapter call: card A's title is NOT in the items, card B's title IS.
    const call = await waitForAdapterCall<{
      items: Array<{ uuid: string; fieldName: string; langcode: string }>
    }>(page, 'import_translations_batched')
    const sentTitleUuids = new Set(
      call.items.filter((i) => i.fieldName === 'title').map((i) => i.uuid),
    )
    expect(sentTitleUuids.has(a.uuid)).toBe(false)
    expect(sentTitleUuids.has(b.uuid)).toBe(true)
  })

  test('a manually edited proposal is applied instead of the suggestion', async () => {
    const a = await addCardWithSourceTitle(page)
    const key = `${a.uuid}:title`

    await openTranslateDialog(page)
    await page.locator('[data-test="translations-batch-request"]').click()
    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    await openRowEditor(page, key)
    const input = page.locator('[data-test="translations-batch-editor-input"]')
    // Seeded with the proposed translation.
    await expect.poll(() => input.inputValue()).toBe(`[DE] ${a.sourceTitle}`)

    await input.fill('Hand-revised batch title')
    await page.locator('[data-test="translations-batch-editor-save"]').click()

    // The row is marked as manually edited and previews the revision.
    const row = batchRow(page, key)
    await row
      .locator('[data-test="translations-batch-edited"]')
      .waitFor({ state: 'visible' })
    expect(await row.textContent()).toContain('Hand-revised batch title')

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === a.uuid && i.fieldName === 'title',
    )
    expect(item).toBeDefined()
    expect(item!.fieldValue).toBe('Hand-revised batch title')
    expect(item!.langcode).toBe('de')

    const host = await blockHost(page, a.uuid)
    await expect
      .poll(async () => (await editableState(page, 'title', host))?.text.trim())
      .toBe('Hand-revised batch title')
  })

  test('a manual translation can be applied without requesting translations', async () => {
    const a = await addCardWithSourceTitle(page)
    const key = `${a.uuid}:title`

    await openTranslateDialog(page)
    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    expect(await applyButton.isDisabled()).toBe(true)

    await openRowEditor(page, key)
    const input = page.locator('[data-test="translations-batch-editor-input"]')
    // No proposal and no real current translation — the editor starts empty.
    await expect.poll(() => input.inputValue()).toBe('')

    await input.fill('Manually translated title')
    await page.locator('[data-test="translations-batch-editor-save"]').click()

    // A manual edit alone unlocks the apply.
    await expect.poll(() => applyButton.isDisabled()).toBe(false)
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Only the edited row is applied — other selected rows have neither a
    // proposal nor an edit.
    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    expect(call.items).toHaveLength(1)
    expect(call.items[0]!.uuid).toBe(a.uuid)
    expect(call.items[0]!.fieldName).toBe('title')
    expect(call.items[0]!.fieldValue).toBe('Manually translated title')

    const host = await blockHost(page, a.uuid)
    await expect
      .poll(async () => (await editableState(page, 'title', host))?.text.trim())
      .toBe('Manually translated title')
  })

  test('discarding a manual edit restores the suggestion', async () => {
    const a = await addCardWithSourceTitle(page)
    const key = `${a.uuid}:title`

    await openTranslateDialog(page)
    await page.locator('[data-test="translations-batch-request"]').click()
    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    await openRowEditor(page, key)
    const input = page.locator('[data-test="translations-batch-editor-input"]')
    await expect.poll(() => input.inputValue()).toBe(`[DE] ${a.sourceTitle}`)
    await input.fill('Draft that gets discarded')
    await page.locator('[data-test="translations-batch-editor-save"]').click()

    const row = batchRow(page, key)
    const pill = row.locator('[data-test="translations-batch-edited"]')
    await pill.waitFor({ state: 'visible' })

    await row.locator('[data-test="translations-batch-edit-reset"]').click()
    await pill.waitFor({ state: 'hidden' })

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // The apply carries the original suggestion again.
    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === a.uuid && i.fieldName === 'title',
    )
    expect(item!.fieldValue).toBe(`[DE] ${a.sourceTitle}`)
  })

  test('a rich text field is edited in the backend editor inside the dialog', async () => {
    const uuid = (await addBlock(page, { bundle: 'text' }))!
    const key = `${uuid}:text`

    await openTranslateDialog(page)
    await openRowEditor(page, key)

    // The backend editor iframe mounts inside the dialog.
    await editableFrame(page)

    // Track the frame's value echoes on the parent window so the save can
    // wait for the pushed value to round-trip (posting → CKEditor → update
    // event). The echo CONTENT matters: the editor seeds the frame with an
    // empty value on ready, and that seed's own echo must not satisfy the
    // wait — saving then would carry the empty model.
    await page.evaluate(() => {
      delete document.body.dataset.bkTestFrameEcho
      window.addEventListener('message', (e) => {
        if (e.data?.name === 'blokkli__editable_field_update') {
          document.body.dataset.bkTestFrameEcho = e.data.data?.text ?? ''
        }
      })
    })
    await setFrameValue(page, '<p>Manuell übersetzter Text.</p>')
    await page.waitForFunction(() =>
      (document.body.dataset.bkTestFrameEcho ?? '').includes(
        'Manuell übersetzter Text',
      ),
    )

    await page.locator('[data-test="translations-batch-editor-save"]').click()
    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    await expect.poll(() => applyButton.isDisabled()).toBe(false)
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === uuid && i.fieldName === 'text',
    )
    expect(item).toBeDefined()
    expect(item!.fieldValue).toContain('Manuell übersetzter Text.')
    expect(item!.langcode).toBe('de')
  })
})
