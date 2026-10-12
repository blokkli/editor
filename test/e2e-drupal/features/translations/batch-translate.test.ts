import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page, Locator } from 'playwright-core'
import {
  blockHost,
  editableState,
  editableFrame,
  setFrameValue,
  waitForEditableText,
} from '../../support/editable'
import { dialog } from '../../support/overlays'
import { openTranslateDialog } from '../../support/translations'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  editorPath,
  getHostContext,
  openEditor,
  revertAllChanges,
} from '../../support/session'

// The page "Notices" (content/nodes/notices.yml): two titles and a text
// without a German value, and a title with an up-to-date German one.
const A = {
  uuid: seedUuid('paragraph', 'notices-first-title'),
  sourceTitle: 'First notice',
}
const B = {
  uuid: seedUuid('paragraph', 'notices-second-title'),
  sourceTitle: 'Second notice',
}
const TEXT = seedUuid('paragraph', 'notices-text')
const TRANSLATED_TITLE = seedUuid('paragraph', 'notices-translated-title')

/** The table row for a given `uuid:fieldName` key. */
function batchRow(page: Page, key: string): Locator {
  return page.locator(
    `[data-test="translations-batch-row"][data-test-key="${key}"]`,
  )
}

/**
 * Deselect every row. The initial selection is partial (only missing/outdated
 * translations are preselected), so getting to "none selected" may take a
 * select-all first.
 */
async function deselectAll(page: Page): Promise<void> {
  const toggleAll = page.locator('[data-test="selection-table-toggle-all"]')
  if (!(await toggleAll.isChecked())) {
    await toggleAll.click()
  }
  await toggleAll.click()
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
 * What's under test: load source texts → request translations from the
 * E2E sandboxes' DeepL fake (`[DE] <source>`) → apply selected ones via
 * `importTranslationsBatched` (`pbBulkTranslateFieldValues`). The apply is the
 * load-bearing operation — its payload determines what actually changes, and
 * the DOM update afterwards is the user-visible result.
 *
 * Why both assertions: a shallow test (just adapter call OR just DOM) misses
 * the failure modes that matter — sending the wrong items, or sending right
 * items that fail to render. We assert both.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**: the
 * German translation of the page "Notices". `afterEach` discards the edit
 * state (`revertAllChanges`), so every test starts with the same untranslated
 * titles and text.
 */
describe('Batch translate (TranslateDialog)', async () => {
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

  test("requests, applies, and mutates both titles' editables", async () => {
    const a = A
    const b = B

    await openTranslateDialog(page)

    const rows = page.locator('[data-test="translations-batch-row"]')
    // Sanity: at least the two titles are in the table (plus the node's and
    // the other paragraphs' translatable fields). We assert a lower bound, not
    // an exact count.
    expect(await rows.count()).toBeGreaterThanOrEqual(2)

    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    // The request action lives inside the table section (sticky action row),
    // not in the dialog footer.
    expect(
      await page
        .locator(
          '[data-test="translations-batch-fields"] [data-test="translations-batch-request"]',
        )
        .count(),
    ).toBe(1)

    expect(await applyButton.isDisabled()).toBe(true)
    await requestButton.click()
    // Apply unlocks once requestTranslation resolves.
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })
    const variables = await imported

    // BOTH titles' editables should now show the `[DE] …` translation. Wait on
    // each one — the mutation patches asynchronously.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ua, ub }) => {
        const app = window.__BLOKKLI__!.app!
        const ea = app.directive.findEditableElement(
          'field_title',
          JSON.parse(ua),
        )
        const eb = app.directive.findEditableElement(
          'field_title',
          JSON.parse(ub),
        )
        return (
          !!ea?.textContent?.includes('[DE]') &&
          !!eb?.textContent?.includes('[DE]')
        )
      },
      { ua: JSON.stringify(hostA), ub: JSON.stringify(hostB) },
    )

    // Both titles' applied state matches the fake's translation and carries no
    // residual diff markup.
    const stateA = await editableState(page, 'field_title', hostA)
    const stateB = await editableState(page, 'field_title', hostB)
    expect(stateA?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateB?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateA?.hasDiffMarkup).toBe(false)
    expect(stateB?.hasDiffMarkup).toBe(false)

    // The mutation's items: langcode is DE, and they include BOTH titles. A
    // regression that drops one title from the apply would fail here.
    const langs = new Set(variables.items.map((i) => i?.langcode))
    expect([...langs]).toEqual(['de'])
    const sentUuids = new Set(
      variables.items
        .filter((i) => i?.name === 'field_title')
        .map((i) => i?.uuid),
    )
    expect(sentUuids.has(a.uuid)).toBe(true)
    expect(sentUuids.has(b.uuid)).toBe(true)
  })

  test("translates the page's own title", async () => {
    // The page's texts are rows like those of its paragraphs, with the page's
    // UUID in their key.
    const host = await getHostContext(page)
    await openTranslateDialog(page)
    await deselectAll(page)
    await batchRow(page, `${host.uuid}:title`)
      .locator('[data-test="translations-batch-row-checkbox"]')
      .click()

    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    await page.locator('[data-test="translations-batch-request"]').click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Drupal takes an item without a UUID for the page, and skips one with a
    // UUID that is no paragraph: the page's goes without.
    const { items } = await imported
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      langcode: 'de',
      name: 'title',
      value: '[DE] Notices',
    })
    expect(items[0]?.uuid ?? null).toBeNull()

    // Drupal wrote it.
    await waitForEditableText(page, 'title', host, '[DE] Notices')
  })

  test('only missing or outdated translations are initially selected', async () => {
    await openTranslateDialog(page)

    // The first title has no DE translation — preselected.
    const missingCheckbox = batchRow(page, `${A.uuid}:field_title`).locator(
      '[data-test="translations-batch-row-checkbox"]',
    )
    expect(await missingCheckbox.isChecked()).toBe(true)

    // The other title has a seeded, up-to-date DE translation — not
    // preselected.
    const translatedCheckbox = batchRow(
      page,
      `${TRANSLATED_TITLE}:field_title`,
    ).locator('[data-test="translations-batch-row-checkbox"]')
    expect(await translatedCheckbox.isChecked()).toBe(false)

    // The header checkbox still selects everything in one click.
    await page.locator('[data-test="selection-table-toggle-all"]').click()
    expect(await translatedCheckbox.isChecked()).toBe(true)

    // Nothing is applied in this test — close the dialog explicitly.
    await page.keyboard.press('Escape')
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })
  })

  test('row action buttons show a tooltip on hover', async () => {
    const key = `${A.uuid}:field_title`

    await openTranslateDialog(page)

    // The tooltip is hidden until hover and must not be clipped by the table
    // cell (regression: overflow:hidden on the td swallowed it entirely).
    const editButton = batchRow(page, key).locator(
      '[data-test="translations-batch-edit"]',
    )
    const tooltip = editButton.locator('[data-test="tooltip-label"]')
    expect(await tooltip.isVisible()).toBe(false)
    await editButton.hover()
    await expect.poll(() => tooltip.isVisible()).toBe(true)
    expect((await tooltip.textContent())?.trim()).toBeTruthy()

    await page.keyboard.press('Escape')
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })
  })

  test('discarding a proposal excludes it from the apply; unchecking does not', async () => {
    const a = A
    const b = B

    await openTranslateDialog(page)
    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    // The selection scopes the auto-translate request: with nothing selected
    // there is nothing to request.
    await deselectAll(page)
    await expect.poll(() => requestButton.isDisabled()).toBe(true)
    await page.locator('[data-test="selection-table-toggle-all"]').click()
    await expect.poll(() => requestButton.isDisabled()).toBe(false)

    await requestButton.click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    // Discard title A's proposal — that's the mechanism that excludes a row
    // from the apply.
    const rowA = batchRow(page, `${a.uuid}:field_title`)
    await rowA.locator('[data-test="translations-batch-discard"]').click()

    // Unchecking title B's row must NOT exclude it — after the request, the
    // checkbox has no influence on what gets applied.
    const rowB = batchRow(page, `${b.uuid}:field_title`)
    await rowB.locator('[data-test="translations-batch-row-checkbox"]').click()

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })
    const variables = await imported

    // Title B has been translated; title A still shows its original EN title.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ub }) => {
        const app = window.__BLOKKLI__!.app!
        const eb = app.directive.findEditableElement(
          'field_title',
          JSON.parse(ub),
        )
        return !!eb?.textContent?.includes('[DE]')
      },
      { ub: JSON.stringify(hostB) },
    )

    const titleA =
      (await editableState(page, 'field_title', hostA))?.text.trim() ?? ''
    expect(titleA).not.toContain('[DE]')

    // The mutation: title A is NOT in the items, title B IS.
    const sentTitleUuids = new Set(
      variables.items
        .filter((i) => i?.name === 'field_title')
        .map((i) => i?.uuid),
    )
    expect(sentTitleUuids.has(a.uuid)).toBe(false)
    expect(sentTitleUuids.has(b.uuid)).toBe(true)
  })

  test('a discarded suggestion disables the apply and can be restored', async () => {
    const a = A
    const key = `${a.uuid}:field_title`

    await openTranslateDialog(page)
    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    // Scope the request to title A only so its proposal is the single pending
    // change — that makes the apply-disabled assertions exact.
    await deselectAll(page)
    const row = batchRow(page, key)
    await row.locator('[data-test="translations-batch-row-checkbox"]').click()
    await requestButton.click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    // Discarding the only pending change disables the apply again; the
    // proposal is no longer shown in the row.
    await row.locator('[data-test="translations-batch-discard"]').click()
    const restore = row.locator('[data-test="translations-batch-restore"]')
    await restore.waitFor({ state: 'visible' })
    expect(await row.textContent()).not.toContain('[DE]')
    await expect.poll(() => applyButton.isDisabled()).toBe(true)

    // Restoring brings the suggestion (and the apply) back.
    await restore.click()
    await row
      .locator('[data-test="translations-batch-discard"]')
      .waitFor({ state: 'visible' })
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const { items } = await imported
    expect(items).toHaveLength(1)
    expect(items[0]!.uuid).toBe(a.uuid)
    expect(items[0]!.name).toBe('field_title')
    expect(items[0]!.value).toBe(`[DE] ${a.sourceTitle}`)
  })

  test('a manually edited proposal is applied instead of the suggestion', async () => {
    const a = A
    const key = `${a.uuid}:field_title`

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

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const { items } = await imported
    const item = items.find(
      (i) => i?.uuid === a.uuid && i?.name === 'field_title',
    )
    expect(item).toBeDefined()
    expect(item!.value).toBe('Hand-revised batch title')
    expect(item!.langcode).toBe('de')

    const host = await blockHost(page, a.uuid)
    await expect
      .poll(async () =>
        (await editableState(page, 'field_title', host))?.text.trim(),
      )
      .toBe('Hand-revised batch title')
  })

  test('a manual translation can be applied without requesting translations', async () => {
    const a = A
    const key = `${a.uuid}:field_title`

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
    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Only the edited row is applied — other selected rows have neither a
    // proposal nor an edit.
    const { items } = await imported
    expect(items).toHaveLength(1)
    expect(items[0]!.uuid).toBe(a.uuid)
    expect(items[0]!.name).toBe('field_title')
    expect(items[0]!.value).toBe('Manually translated title')

    const host = await blockHost(page, a.uuid)
    await expect
      .poll(async () =>
        (await editableState(page, 'field_title', host))?.text.trim(),
      )
      .toBe('Manually translated title')
  })

  test('discarding a manual edit restores the suggestion', async () => {
    const a = A
    const key = `${a.uuid}:field_title`

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

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // The apply carries the original suggestion again.
    const { items } = await imported
    const item = items.find(
      (i) => i?.uuid === a.uuid && i?.name === 'field_title',
    )
    expect(item!.value).toBe(`[DE] ${a.sourceTitle}`)
  })

  test('a rich text field is edited in the backend editor inside the dialog', async () => {
    const uuid = TEXT
    const key = `${uuid}:field_text`

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
    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const { items } = await imported
    const item = items.find((i) => i?.uuid === uuid && i?.name === 'field_text')
    expect(item).toBeDefined()
    expect(item!.value).toContain('Manuell übersetzter Text.')
    expect(item!.langcode).toBe('de')
  })
})
