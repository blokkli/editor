import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { waitForEditorReady } from '../../../e2e/support/session'
import { emitEvent } from '../../../e2e/support/events'
import { applyDiff, editDiff } from '../../../e2e/support/diff'
import {
  editableState,
  blockHost,
  plaintextEditor,
  editableOverlay,
} from '../../../e2e/support/editable'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// Two titles of the page "Notices" (content/nodes/notices.yml) without a
// German value: the German page shows their English one.
const FIRST = {
  uuid: seedUuid('paragraph', 'notices-first-title'),
  sourceTitle: 'First notice',
}
const SECOND = {
  uuid: seedUuid('paragraph', 'notices-second-title'),
  sourceTitle: 'Second notice',
}

/**
 * Regression test for the auto-translate DOM-staleness bug.
 *
 * When a user accepts an auto-translation in the DiffApproval preview, the
 * mutation persists the new value via `importTranslationsBatched`, then
 * DiffApproval unmounts — and each `Highlight/Item` re-inserts the original
 * Vue-managed child nodes captured before `setDiffHtml` was applied. Those
 * captured nodes hold the PRE-translation text, so the DOM ends up showing the
 * old text even though the underlying state was updated correctly.
 *
 * What this guards: after the user clicks "Apply", the editable's DOM shows
 * the new translated value (not the original) and carries no leftover diff
 * markup.
 *
 * The translations come from the E2E sandboxes' DeepL fake, which returns
 * `[<LANG>] <source>` for each item, so no test reaches DeepL.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de**: the
 * German translation of the page "Notices". Each test translates a title of
 * its own.
 */
describe('Auto-translate', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /** Select the paragraph and run the auto-translate action on it. */
  async function autoTranslate(uuid: string): Promise<void> {
    // Select it so AutoTranslate's `selection.uuids` filter picks it up.
    await emitEvent(page, 'select', uuid)

    // The PluginItemAction renders with `data-test="plugin-item-action-<id>"`.
    const autoTranslateButton = page.locator(
      '[data-test="plugin-item-action-auto-translate"]',
    )
    await autoTranslateButton.waitFor({ state: 'visible' })
    await autoTranslateButton.click()

    // DiffApproval mounts once requestTranslation resolves — the toolbar's
    // Apply button is the stable readiness signal.
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })
  }

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

  test('translating a title updates the editable DOM after Apply', async () => {
    const host = await blockHost(page, FIRST.uuid)
    const before = await editableState(page, 'field_title', host)
    expect(before, 'the title editable should exist').not.toBeNull()
    expect(before!.text.trim()).toBe(FIRST.sourceTitle)
    expect(before!.hasDiffMarkup).toBe(false)
    expect(before!.diffActive).toBe(false)

    await autoTranslate(FIRST.uuid)

    // The fake returns `[DE] <source>` for each item; the title field should
    // now have its preview overlay applied.
    expect((await editableState(page, 'field_title', host))?.diffActive).toBe(
      true,
    )

    const translated = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)
    await translated

    // After apply, all diff-preview markers should be gone editor-wide.
    await page.waitForFunction(
      () => document.querySelectorAll('[data-bk-diff-active]').length === 0,
    )

    // THE BUG: after DiffApproval unmounts, each Item re-inserts the originally
    // captured Vue-managed nodes — which carried the PRE-translation text. So
    // the DOM ends up showing the old text instead of the newly-applied
    // `[DE] <source>` value.
    await expect
      .poll(async () => {
        const state = await editableState(page, 'field_title', host)
        return state?.text.trim() ?? ''
      })
      .toBe(`[DE] ${FIRST.sourceTitle}`)

    const after = await editableState(page, 'field_title', host)
    expect(after?.hasDiffMarkup).toBe(false)
    expect(after?.diffActive).toBe(false)
  })

  test('a manually edited translation is persisted instead of the suggestion', async () => {
    await autoTranslate(SECOND.uuid)

    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })

    // Seeded with the translated suggestion, not the current field value.
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe(`[DE] ${SECOND.sourceTitle}`)

    await plaintextEditor(page).fill('Hand-revised translated title')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    const translated = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)

    // The batch import must carry the revision (not the suggestion) with the
    // target langcode.
    const { items } = await translated
    expect(
      items.find((i) => i?.uuid === SECOND.uuid && i.name === 'field_title'),
    ).toMatchObject({ value: 'Hand-revised translated title', langcode: 'de' })

    // The DOM shows the revision after DiffApproval unmounts.
    const host = await blockHost(page, SECOND.uuid)
    await expect
      .poll(async () =>
        (await editableState(page, 'field_title', host))?.text.trim(),
      )
      .toBe('Hand-revised translated title')
    expect(await page.locator('[data-bk-diff-active]').count()).toBe(0)

    // Drupal stored it.
    await page.reload()
    await waitForEditorReady(page)
    await expect
      .poll(async () =>
        (
          await editableState(
            page,
            'field_title',
            await blockHost(page, SECOND.uuid),
          )
        )?.text.trim(),
      )
      .toBe('Hand-revised translated title')
  })
})
