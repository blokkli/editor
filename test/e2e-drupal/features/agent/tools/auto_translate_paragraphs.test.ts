import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../../e2e/support/sidebar'
import { runComponentTool } from '../../../../e2e/support/agent'
import {
  plaintextEditor,
  editableOverlay,
} from '../../../../e2e/support/editable'
import { applyDiff, editDiff } from '../../../../e2e/support/diff'
import type { AutoTranslateResult } from '../../../../../src/modules/agent/runtime/app/tools/auto_translate_paragraphs/index'
import { nextMutation } from '../../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import {
  editorPath,
  openEditor,
  revertAllChanges,
} from '../../../support/session'

/** An English-only title of the page "Notices" (content/nodes/notices.yml). */
const TITLE = seedUuid('paragraph', 'notices-first-title')
const SOURCE_TITLE = 'First notice'

/**
 * E2E for the `auto_translate_paragraphs` component tool driven through its
 * real approval UI (via the `runComponentTool` test seam — no LLM/WebSocket
 * loop).
 *
 * Focus: the manual-edit feedback loop for translations. When the user revises
 * a suggested translation before applying, the revision must be persisted via
 * `importTranslationsBatched` (`pbBulkTranslateFieldValues`) with the target
 * langcode, reported in `editedByUser`, and fed back to the agent as
 * calibration guidance. The baseline case pins that a plain acceptance
 * reports neither.
 *
 * The translations come from the E2E sandboxes' DeepL fake, never from DeepL:
 * each value comes back as `[DE] <source>`.
 *
 * Page lifecycle: one editor page opened directly in /de (the tool requires
 * translating mode) with the `test-cases` sidebar open: the German translation
 * of the page "Notices", whose first title has no German value. A title yields
 * one plain item (`field_title`), the active and editable unit. `afterEach`
 * discards the edit state, so each test starts with the untranslated title.
 */
describe('agent: auto_translate_paragraphs', async () => {
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
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await revertAllChanges(page)
  })

  test('a manually edited translation is applied and reported to the agent', async () => {
    const done = runComponentTool<AutoTranslateResult>(
      page,
      'auto_translate_paragraphs',
      { uuids: [TITLE] },
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
      .toBe(`[DE] ${SOURCE_TITLE}`)

    await plaintextEditor(page).fill('Hand-revised translation')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)
    const result = await done

    // The title was accepted, with the manual revision.
    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser?.[TITLE]?.field_title?.value).toBe(
      'Hand-revised translation',
    )
    expect(result.agentMessage).toContain('manually revised')
    expect(result.agentMessage).toContain('Hand-revised translation')

    const variables = await imported
    const item = variables.items.find(
      (i) => i?.uuid === TITLE && i?.name === 'field_title',
    )
    expect(item).toBeDefined()
    expect(item!.value).toBe('Hand-revised translation')
    expect(item!.langcode).toBe('de')
  })

  test('accepting without editing reports no editedByUser', async () => {
    const done = runComponentTool<AutoTranslateResult>(
      page,
      'auto_translate_paragraphs',
      { uuids: [TITLE] },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    const imported = nextMutation(page, 'pbBulkTranslateFieldValues')
    await applyDiff(page)
    const result = await done
    await imported

    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser).toBeUndefined()
  })
})
