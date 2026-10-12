import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page, Locator } from 'playwright-core'
import { runComponentTool } from '../../support/agent'
import { applyDiff, editDiff } from '../../support/diff'
import {
  blockHost,
  editableOverlay,
  editableText,
  plaintextEditor,
  waitForEditableText,
} from '../../support/editable'
import { emitEvent } from '../../support/events'
import { countMutations, nextMutation } from '../../support/mutations'
import {
  dialog,
  dismissMessages,
  messageTexts,
  shownMessages,
} from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  editorPath,
  openEditor,
  revertAllChanges,
  withApp,
} from '../../support/session'
import { openSidebar } from '../../support/sidebar'
import {
  buildSingleLangCsv,
  openTranslateDialog,
  switchToCsvImportTab,
  uploadTranslationsFile,
} from '../../support/translations'

// The titles of the page "Limits" (content/nodes/limits.yml), English only.
// The first fills its field: the DeepL fake's "[DE] " makes it too long.
const LONG = seedUuid('paragraph', 'limits-long-title')
const SHORT = {
  uuid: seedUuid('paragraph', 'limits-short-title'),
  sourceTitle: 'A short title',
}

/** The longest text that a title takes. */
const MAX_LENGTH = 255

/**
 * The editor's message for a batch that Drupal refuses: what Drupal said is
 * the message itself, and nothing about it looks like an error to look into.
 */
const REFUSAL = {
  text: expect.stringContaining(String(MAX_LENGTH)),
  additional: null,
  hasDetails: false,
}

/** The table row of the translate dialog for a `uuid:fieldName` key. */
function batchRow(page: Page, key: string): Locator {
  return page.locator(
    `[data-test="translations-batch-row"][data-test-key="${key}"]`,
  )
}

/**
 * Drupal rejects a batch of translations when one of them doesn't fit its
 * field. Nothing of the batch is stored then, and whatever applied it must
 * neither look applied nor lose its texts: the dialogs stay open, the approval
 * of an auto-translation starts again, and the agent's tool ends with an
 * error.
 *
 * Drupal's message is in the language of the page, so the specs look for the
 * limit in it.
 *
 * Page lifecycle: one editor page, opened **directly in /de**: the German
 * translation of the page "Limits". `afterEach` discards the edit state, so
 * every test starts with untranslated titles.
 */
describe('Translations that Drupal rejects', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let longTitle: string

  /** How many mutations the edit state has. */
  function storedMutations(): Promise<number> {
    return withApp(page, (app) => app.state.mutations.value.length)
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/grenzen', 'limits'),
    )
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )

    // What the specs rely on: the title fits, its translation doesn't.
    longTitle = await editableText(
      page,
      'field_title',
      await blockHost(page, LONG),
    )
    expect(longTitle.length).toBeLessThanOrEqual(MAX_LENGTH)
    expect(`[DE] ${longTitle}`.length).toBeGreaterThan(MAX_LENGTH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await dismissMessages(page)
    await revertAllChanges(page)
  })

  test('the translate dialog stays open with its texts', async () => {
    await openTranslateDialog(page)
    const applyButton = page.locator('[data-test="translations-batch-apply"]')
    await page.locator('[data-test="translations-batch-request"]').click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    const rejected = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    expect((await rejected).items.map((item) => item?.uuid)).toContain(LONG)

    // It says what Drupal said, and nothing is stored.
    const error = page.locator('[data-test="translations-batch-error"]')
    await error.waitFor({ state: 'visible' })
    expect(await error.textContent()).toContain(String(MAX_LENGTH))
    expect(await dialog(page, 'translations-translate').isVisible()).toBe(true)
    expect(await storedMutations()).toBe(0)

    // The suggestions are still there. Without the one that is too long, they
    // are applied.
    await batchRow(page, `${LONG}:field_title`)
      .locator('[data-test="translations-batch-discard"]')
      .click()
    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    const uuids = (await imported).items.map((item) => item?.uuid)
    expect(uuids).toContain(SHORT.uuid)
    expect(uuids).not.toContain(LONG)
    await waitForEditableText(
      page,
      'field_title',
      await blockHost(page, SHORT.uuid),
      `[DE] ${SHORT.sourceTitle}`,
    )
  })

  test('the approval of an auto-translation starts again', async () => {
    await emitEvent(page, 'select', LONG)
    await page
      .locator('[data-test="plugin-item-action-auto-translate"]')
      .click()
    const applyButton = page.locator('[data-test="diff-approval-apply"]')
    await applyButton.waitFor({ state: 'visible' })

    const rejected = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)
    await rejected

    // The editor says what Drupal said, and the suggestion is back.
    await expect.poll(() => shownMessages(page)).toEqual([REFUSAL])
    expect(await storedMutations()).toBe(0)
    await dismissMessages(page)
    await applyButton.waitFor({ state: 'visible' })

    // It can be corrected there.
    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe(`[DE] ${longTitle}`)
    await plaintextEditor(page).fill('Ein kurzer Titel')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    const translated = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)
    expect((await translated).items).toMatchObject([
      { uuid: LONG, name: 'field_title', value: 'Ein kurzer Titel' },
    ])
    await applyButton.waitFor({ state: 'detached' })
    await waitForEditableText(
      page,
      'field_title',
      await blockHost(page, LONG),
      'Ein kurzer Titel',
    )
  })

  test('the import dialog stays open with its selection', async () => {
    const csv = buildSingleLangCsv([
      {
        key: `${SHORT.uuid}:field_title`,
        source: SHORT.sourceTitle,
        translation: 'a'.repeat(MAX_LENGTH + 1),
      },
    ])

    await page.locator('[data-test="translations-banner-csv"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
    await switchToCsvImportTab(page)
    await uploadTranslationsFile(page, {
      name: 'translations.csv',
      content: csv,
    })
    const rows = page.locator('[data-test="translations-csv-import-row"]')
    await expect.poll(() => rows.count()).toBe(1)

    const rejected = nextMutation(page, 'pbBulkTranslateFieldValues')
    await page.locator('[data-test="translations-csv-import-apply"]').click()
    await rejected

    await expect.poll(() => shownMessages(page)).toEqual([REFUSAL])
    // A dialog that closes takes a moment to leave, so "it's still visible"
    // says nothing right away: it must not become hidden.
    await expect(
      dialog(page, 'translations-csv').waitFor({
        state: 'hidden',
        timeout: 1000,
      }),
    ).rejects.toThrow()
    expect(await rows.count()).toBe(1)
    expect(await storedMutations()).toBe(0)

    await page.keyboard.press('Escape')
    await dialog(page, 'translations-csv').waitFor({ state: 'hidden' })
  })

  // Last: it opens a sidebar.
  test("the agent's translation tool ends with an error", async () => {
    await openSidebar(page, 'test-cases')
    const errors = countMutations(page, 'pbBulkTranslateFieldValues')

    const done = runComponentTool<{ error?: string }>(
      page,
      'auto_translate_paragraphs',
      { uuids: [LONG] },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })
    await applyDiff(page)

    // What the agent gets names the paragraph and the field, and says that
    // nothing was written.
    const result = await done
    expect(errors()).toBe(1)
    expect(result.error).toContain(String(MAX_LENGTH))
    expect(result.error).toContain(`field_title.0.value (paragraph ${LONG})`)
    expect(result.error).toContain('None of the values were written.')
    expect(result).not.toHaveProperty('acceptedCount')
    expect(await storedMutations()).toBe(0)

    // No message of the editor on top: the conversation shows the error.
    expect(await messageTexts(page)).toEqual([])
  })
})
