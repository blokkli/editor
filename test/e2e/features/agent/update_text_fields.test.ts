import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { openSidebar } from '../../support/sidebar'
import { setupEditorE2E } from '../../support/setup'
import { runComponentTool } from '../../support/agent'
import { addCardWithSourceTitle } from '../../support/translations'
import {
  blockHost,
  waitForEditableText,
  plaintextEditor,
  editableOverlay,
} from '../../support/editable'
import { applyDiff, editDiff } from '../../support/diff'
import type { BatchRewriteResult } from '../../../../src/modules/agent/runtime/app/tools/update_text_fields/index'

/**
 * E2E for the `update_text_fields` component tool driven through its real
 * approval UI (via the `runComponentTool` test seam — no LLM/WebSocket loop).
 *
 * Focus: the manual-edit feedback loop. When the user revises a suggestion in
 * the approval UI before applying, the tool result must carry the revision in
 * `editedByUser` and the `agentMessage` must tell the agent to calibrate.
 * The baseline case pins that a plain acceptance reports neither.
 *
 * Page lifecycle: one editor page with the `test-cases` sidebar open. Each
 * test adds its own card block, so accumulated state is harmless.
 */
describe('agent: update_text_fields', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('a manually edited suggestion is applied and reported to the agent', async () => {
    const { uuid } = await addCardWithSourceTitle(page)
    const host = await blockHost(page, uuid)

    const done = runComponentTool<BatchRewriteResult>(
      page,
      'update_text_fields',
      {
        updates: [{ uuid, fieldName: 'title', value: 'Suggested title' }],
      },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    await editDiff(page)
    const overlay = editableOverlay(page)
    await overlay.waitFor({ state: 'visible' })
    // Seeded with the tool's suggestion.
    await expect
      .poll(() => plaintextEditor(page).inputValue())
      .toBe('Suggested title')

    await plaintextEditor(page).fill('Revised title')
    await page.keyboard.press('Enter')
    await overlay.waitFor({ state: 'detached' })

    await applyDiff(page)
    const result = await done

    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser?.[uuid]?.title?.value).toBe('Revised title')
    expect(result.agentMessage).toContain('manually revised')
    expect(result.agentMessage).toContain('Revised title')

    await waitForEditableText(page, 'title', host, 'Revised title')
  })

  test('accepting without editing reports no editedByUser', async () => {
    const { uuid } = await addCardWithSourceTitle(page)
    const host = await blockHost(page, uuid)

    const done = runComponentTool<BatchRewriteResult>(
      page,
      'update_text_fields',
      {
        updates: [{ uuid, fieldName: 'title', value: 'Accepted as suggested' }],
      },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    await applyDiff(page)
    const result = await done

    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser).toBeUndefined()

    await waitForEditableText(page, 'title', host, 'Accepted as suggested')
  })
})
