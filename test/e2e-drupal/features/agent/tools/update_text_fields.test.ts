import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../support/sidebar'
import { runComponentTool } from '../../../support/agent'
import {
  blockHost,
  waitForEditableText,
  plaintextEditor,
  editableOverlay,
} from '../../../support/editable'
import { applyDiff, editDiff } from '../../../support/diff'
import type { BatchRewriteResult } from '../../../../../src/modules/agent/runtime/app/tools/update_text_fields/index'
import { nextMutation } from '../../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../../support/session'

// The title of the page "Blocks" (content/nodes/blocks.yml): a plain field, so
// the plaintext editor opens.
const TITLE = seedUuid('paragraph', 'first-title')

/**
 * E2E for the `update_text_fields` component tool driven through its real
 * approval UI (via the `runComponentTool` test seam — no LLM/WebSocket loop).
 *
 * Focus: the manual-edit feedback loop. When the user revises a suggestion in
 * the approval UI before applying, the tool result must carry the revision in
 * `editedByUser` and the `agentMessage` must tell the agent to calibrate.
 * The baseline case pins that a plain acceptance reports neither.
 *
 * Applying stores the values in Drupal (`pbBulkUpdateFieldValues`); the
 * editor then renders what Drupal returns.
 *
 * Page lifecycle: one editor page with the `test-cases` sidebar open. Both
 * tests change the same title, each to its own value.
 */
describe('agent: update_text_fields', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('a manually edited suggestion is applied and reported to the agent', async () => {
    const host = await blockHost(page, TITLE)

    const done = runComponentTool<BatchRewriteResult>(
      page,
      'update_text_fields',
      {
        updates: [
          { uuid: TITLE, fieldName: 'field_title', value: 'Suggested title' },
        ],
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

    const stored = nextMutation(page, 'pbBulkUpdateFieldValues')
    await applyDiff(page)
    const result = await done

    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser?.[TITLE]?.field_title?.value).toBe(
      'Revised title',
    )
    expect(result.agentMessage).toContain('manually revised')
    expect(result.agentMessage).toContain('Revised title')

    expect((await stored).items).toEqual([
      { uuid: TITLE, name: 'field_title', value: 'Revised title' },
    ])
    await waitForEditableText(page, 'field_title', host, 'Revised title')
  })

  test('accepting without editing reports no editedByUser', async () => {
    const host = await blockHost(page, TITLE)

    const done = runComponentTool<BatchRewriteResult>(
      page,
      'update_text_fields',
      {
        updates: [
          {
            uuid: TITLE,
            fieldName: 'field_title',
            value: 'Accepted as suggested',
          },
        ],
      },
    )
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    const stored = nextMutation(page, 'pbBulkUpdateFieldValues')
    await applyDiff(page)
    const result = await done

    expect(result.acceptedCount).toBe(1)
    expect(result.editedByUser).toBeUndefined()

    expect((await stored).items).toEqual([
      { uuid: TITLE, name: 'field_title', value: 'Accepted as suggested' },
    ])
    await waitForEditableText(
      page,
      'field_title',
      host,
      'Accepted as suggested',
    )
  })
})
