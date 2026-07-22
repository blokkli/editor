import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { openSidebar } from '../../support/sidebar'
import { setupEditorE2E } from '../../support/setup'
import { runComponentTool } from '../../support/agent'
import {
  addCardWithSourceTitle,
  autoTranslateMockEntry,
} from '../../support/translations'
import { plaintextEditor, editableOverlay } from '../../support/editable'
import { applyDiff, editDiff } from '../../support/diff'
import { clearAdapterCalls, waitForAdapterCall } from '../../support/recorder'
import type { AutoTranslateResult } from '../../../../src/modules/agent/runtime/app/tools/auto_translate_paragraphs/index'

type ImportTranslationsArgs = {
  items: Array<{
    langcode: string
    uuid: string
    fieldName: string
    fieldValue: string
  }>
}

/**
 * E2E for the `auto_translate_paragraphs` component tool driven through its
 * real approval UI (via the `runComponentTool` test seam — no LLM/WebSocket
 * loop).
 *
 * Focus: the manual-edit feedback loop for translations. When the user revises
 * a suggested translation before applying, the revision must be persisted via
 * `importTranslationsBatched` with the target langcode, reported in
 * `editedByUser`, and fed back to the agent as calibration guidance. The
 * baseline case pins that a plain acceptance reports neither.
 *
 * The adapter's `requestTranslation` is mocked (`autoTranslateMockEntry`) so
 * the suite never hits the paid DeepL API — each value comes back as
 * `[DE] <source>`.
 *
 * Page lifecycle: one editor page opened directly in /de (the tool requires
 * translating mode) with the `test-cases` sidebar open. Each test adds its own
 * card, so accumulated state is harmless. A card yields two plain items
 * (`title`, `text`); `title` is the active unit (its element exists in the
 * DOM) and the only editable one (`text` has no editable element/config).
 */
describe('agent: auto_translate_paragraphs', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true', {
      localStorage: autoTranslateMockEntry(),
    })
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('a manually edited translation is applied and reported to the agent', async () => {
    const { uuid, sourceTitle } = await addCardWithSourceTitle(page)
    await clearAdapterCalls(page)

    const done = runComponentTool<AutoTranslateResult>(
      page,
      'auto_translate_paragraphs',
      { uuids: [uuid] },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })
    // Seeded with the translated suggestion.
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe(`[DE] ${sourceTitle}`)

    await plaintextEditor(page).fill('Hand-revised translation')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    await applyDiff(page)
    const result = await done

    // Both card items (title + text) were accepted; the title carries the
    // manual revision.
    expect(result.acceptedCount).toBe(2)
    expect(result.editedByUser?.[uuid]?.title?.value).toBe(
      'Hand-revised translation',
    )
    expect(result.agentMessage).toContain('manually revised')
    expect(result.agentMessage).toContain('Hand-revised translation')

    const call = await waitForAdapterCall<ImportTranslationsArgs>(
      page,
      'import_translations_batched',
    )
    const item = call.items.find(
      (i) => i.uuid === uuid && i.fieldName === 'title',
    )
    expect(item).toBeDefined()
    expect(item!.fieldValue).toBe('Hand-revised translation')
    expect(item!.langcode).toBe('de')
  })

  test('accepting without editing reports no editedByUser', async () => {
    const { uuid } = await addCardWithSourceTitle(page)

    const done = runComponentTool<AutoTranslateResult>(
      page,
      'auto_translate_paragraphs',
      { uuids: [uuid] },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    await applyDiff(page)
    const result = await done

    expect(result.acceptedCount).toBe(2)
    expect(result.editedByUser).toBeUndefined()
  })
})
