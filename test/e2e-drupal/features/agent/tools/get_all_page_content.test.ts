import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../../e2e/support/sidebar'
import { runAgentTool } from '../../../../e2e/support/agent'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import { editorPath, openEditor } from '../../../support/session'

const TEASER = seedUuid('paragraph', 'reading-teaser')

/**
 * Regression test for the agent's `get_all_page_content` tool — and the shared
 * `readBlockContentFields` helper underneath it.
 *
 * The helper used to discover editable fields by walking `directive.getEditablesForBlock`,
 * which only finds fields that registered themselves via the runtime
 * `v-blokkli-editable` directive. Fields without the directive were silently
 * dropped — so the LLM saw an empty `text` for any block that renders its
 * fields without an inline editable surface.
 *
 * The teaser of the page "Reading" (content/nodes/reading.yml) is the fixture:
 * it renders its `field_title` and `field_lead` without the directive and
 * without `propsFieldMapping`. Discovery goes through `editableFieldConfig`,
 * and Drupal provides the raw values, so both must reach the tool.
 */
describe('agent: get_all_page_content', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/reading', 'reading'),
    )
    // The test-cases sidebar registers `runAgentTool` on `window.__BLOKKLI__.test`
    // only once its pane mounts.
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('surfaces fields that are rendered without a directive', async () => {
    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === TEASER)
    expect(entry, 'teaser should appear in get_all_page_content').toBeDefined()
    expect(entry!.bundle).toBe('teaser')

    expect(entry!.text).toContain('A teaser')
    expect(entry!.text).toContain('The lead of the teaser.')
  })
})
