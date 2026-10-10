import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  waitForEditorReady,
  editorPath,
  openEditor,
} from '../../support/session'
import { emitEvent } from '../../support/events'
import { applyDiff, cancelDiff, editDiff } from '../../support/diff'
import {
  editableState,
  blockHost,
  plaintextEditor,
  editableOverlay,
} from '../../support/editable'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

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

// Two widgets of the page "Widgets" (content/nodes/widgets.yml), English only:
// a title bound to an element, a text (`field_lead`) without one.
const FIRST_WIDGET = {
  uuid: seedUuid('paragraph', 'widgets-first'),
  sourceText: 'The text of the first widget.',
}
const SECOND_WIDGET = {
  uuid: seedUuid('paragraph', 'widgets-second'),
  sourceText: 'The text of the second widget.',
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
 * Page lifecycle: two pages, opened in parallel and **directly in /de**: the
 * German translations of the page "Notices" (`page`) and of the page
 * "Widgets" (`widgetPage`), for a field without an element. Each test
 * translates a paragraph of its own.
 */
describe('Auto-translate', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let widgetPage: Page

  /** Select the paragraph and run the auto-translate action on it. */
  async function autoTranslate(target: Page, uuid: string): Promise<void> {
    // Select it so AutoTranslate's `selection.uuids` filter picks it up.
    await emitEvent(target, 'select', uuid)

    // The PluginItemAction renders with `data-test="plugin-item-action-<id>"`.
    const autoTranslateButton = target.locator(
      '[data-test="plugin-item-action-auto-translate"]',
    )
    await autoTranslateButton.waitFor({ state: 'visible' })
    await autoTranslateButton.click()

    // DiffApproval mounts once requestTranslation resolves — the toolbar's
    // Apply button is the stable readiness signal.
    await target
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })
  }

  /**
   * Make the unit of the element-less `field_lead` the active one: a
   * block-level group. Fields without an element keep the order they came in,
   * so it may already be.
   */
  async function activateGroupUnit(target: Page): Promise<void> {
    const toolbar = target.locator('[data-test="diff-approval-toolbar"]')
    if ((await toolbar.getAttribute('data-test-unit-kind')) !== 'group') {
      await target.keyboard.press('ArrowDown')
    }
    await expect
      .poll(() => toolbar.getAttribute('data-test-unit-kind'))
      .toBe('group')
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, widgetPage] = await Promise.all([
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/de/mitteilungen', 'notices'),
      ),
      openEditor(sandbox, 'Anna Keller', editorPath('/de/widgets', 'widgets')),
    ])
    await Promise.all(
      [page, widgetPage].map((target) =>
        target.waitForFunction(
          () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
        ),
      ),
    )
  })

  afterAll(async () => {
    await Promise.all([page.close(), widgetPage.close()])
  })

  test('translating a title updates the editable DOM after Apply', async () => {
    const host = await blockHost(page, FIRST.uuid)
    const before = await editableState(page, 'field_title', host)
    expect(before, 'the title editable should exist').not.toBeNull()
    expect(before!.text.trim()).toBe(FIRST.sourceTitle)
    expect(before!.hasDiffMarkup).toBe(false)
    expect(before!.diffActive).toBe(false)

    await autoTranslate(page, FIRST.uuid)

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
    await autoTranslate(page, SECOND.uuid)

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

  test('every translated field gets a visible highlight', async () => {
    const { uuid, sourceText } = FIRST_WIDGET
    await autoTranslate(widgetPage, uuid)

    // Both widget fields (title + text) are translated, so two approval units
    // exist...
    const items = widgetPage.locator(
      '[data-test="diff-approval-highlight-item"]',
    )
    await expect.poll(() => items.count()).toBe(2)

    // ...and both must be visible in the canvas. A unit whose highlight can't
    // be placed is still counted in the toolbar, so hiding it leaves the user
    // approving something they cannot see.
    await expect
      .poll(() =>
        widgetPage
          .locator('[data-test="diff-approval-highlight-item"]:visible')
          .count(),
      )
      .toBe(2)

    // The `field_lead` highlight anchors to the block element as a fallback.
    expect(
      await widgetPage
        .locator(
          '[data-test="diff-approval-highlight-item"][data-test-fallback="true"]:visible',
        )
        .count(),
    ).toBe(1)

    // The element-less field previews through the block's props: while the
    // unit is accepted (the default), the widget renders the proposed
    // translation as its real value (no diff markup is possible via a prop).
    const block = widgetPage.locator(`[data-bk-uuid="${uuid}"]`)
    await expect.poll(() => block.textContent()).toContain(`[DE] ${sourceText}`)

    // Rejecting the unit restores the original value reactively.
    await activateGroupUnit(widgetPage)
    await widgetPage.keyboard.press('Space')
    await expect
      .poll(async () =>
        (await block.textContent())?.includes(`[DE] ${sourceText}`),
      )
      .toBe(false)
    expect(await block.textContent()).toContain(sourceText)

    await cancelDiff(widgetPage)

    // Cancel restores everything — the title's diff markup (DOM strategy) and
    // the text's prop override (props strategy) are both gone.
    await expect
      .poll(async () => (await block.textContent())?.includes('[DE]'))
      .toBe(false)
  })

  test('a translation for a field without an editable element can be edited', async () => {
    const { uuid, sourceText } = SECOND_WIDGET
    await autoTranslate(widgetPage, uuid)

    // Activate the element-less `field_lead` unit and open the manual edit
    // overlay for it.
    await activateGroupUnit(widgetPage)
    await editDiff(widgetPage)
    const overlay = editableOverlay(widgetPage)
    await overlay.waitFor({ state: 'visible' })

    // Seeded with the translated suggestion.
    await expect
      .poll(() => plaintextEditor(widgetPage).inputValue())
      .toBe(`[DE] ${sourceText}`)

    await plaintextEditor(widgetPage).fill('Hand-revised element-less text')
    await widgetPage.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    // The revision previews through the block's props.
    const block = widgetPage.locator(`[data-bk-uuid="${uuid}"]`)
    await expect
      .poll(() => block.textContent())
      .toContain('Hand-revised element-less text')

    const translated = nextMutation(widgetPage, 'pbBulkTranslateFieldValues')
    await applyDiff(widgetPage)

    const { items } = await translated
    expect(
      items.find((i) => i?.uuid === uuid && i.name === 'field_lead'),
    ).toMatchObject({ value: 'Hand-revised element-less text', langcode: 'de' })
  })
})
