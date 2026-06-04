import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../../support/session'
import { addBlock } from '../../../support/blocks'
import { openSidebar } from '../../../support/sidebar'
import { setupEditorE2E } from '../../../support/setup'
import { runAgentTool } from '../../../support/agent'

/**
 * Regression test for the agent's `get_all_page_content` tool — and the shared
 * `readBlockContentFields` helper underneath it.
 *
 * The helper used to discover editable fields by walking `directive.getEditablesForBlock`,
 * which only finds fields that registered themselves via the runtime
 * `v-blokkli-editable` directive. Fields declared via `propsFieldMapping` but
 * NOT marked with the directive were silently dropped — so the LLM saw an
 * empty `text` for any block that drives its editable fields purely through
 * props (a common pattern for components that don't render an inline editable
 * surface, or that render via a child component).
 *
 * The Card playground bundle is the fixture: its `title` is declared with both
 * `propsFieldMapping` and `v-blokkli-editable:title` (the directive path), but
 * its `text` is declared only via `propsFieldMapping` (no directive in the
 * template). The fix must surface BOTH values to the tool.
 */
describe('agent: get_all_page_content', async () => {
  await setupEditorE2E()

  let page: Page
  let cardUuid: string

  beforeAll(async () => {
    page = await openEditor()
    // The test-cases sidebar registers `runAgentTool` on `window.__BLOKKLI__.test`
    // only once its pane mounts.
    await openSidebar(page, 'test-cases')

    const uuid = await addBlock(page, { bundle: 'card', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add card block for test')
    cardUuid = uuid
  })

  afterAll(async () => {
    await page.close()
  })

  test('surfaces fields declared via propsFieldMapping without a directive', async () => {
    // Read the card's actual field values straight off the editor state, so the
    // assertion compares the tool's view against the canonical truth — no need
    // to hardcode lorem defaults that might change.
    const expected = await page.evaluate((uuid) => {
      const item = window.__BLOKKLI__!.app!.state.getFieldListItem(uuid)
      const props = item?.props as { title?: string; text?: string }
      return { title: props?.title ?? '', text: props?.text ?? '' }
    }, cardUuid)

    expect(expected.title.length).toBeGreaterThan(0)
    expect(expected.text.length).toBeGreaterThan(0)

    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === cardUuid)
    expect(
      entry,
      'card block should appear in get_all_page_content',
    ).toBeDefined()
    expect(entry!.bundle).toBe('card')

    // The bug: `text` is dropped because Card's <p> has propsFieldMapping but
    // no `v-blokkli-editable:text`. The fix routes discovery through
    // `editableFieldConfig` so both fields show up.
    expect(entry!.text).toContain(expected.title)
    expect(entry!.text).toContain(expected.text)
  })
})
