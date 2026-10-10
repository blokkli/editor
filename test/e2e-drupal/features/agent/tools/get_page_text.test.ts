import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../support/sidebar'
import { runAgentTool } from '../../../support/agent'
import {
  resetSandbox,
  sandboxHost,
  workerSandbox,
} from '../../../support/sandbox'
import { editorPath, openEditor } from '../../../support/session'

/**
 * E2E for the `get_page_text` tool — the DOM-based Markdown rendering of the
 * page that the agent should reach for whenever a prompt is about page
 * content/meaning (summarising, intro generation, translation).
 *
 * Reading from `ui.providerElement` + turndown means:
 *  - Content rendered without a `v-blokkli-editable` directive is captured
 *    (it's in the DOM regardless — the teaser's title and lead).
 *  - Headings, paragraphs, lists keep their semantic structure as Markdown.
 *  - Referenced-entity content is included automatically because components
 *    render it.
 *
 * On the page "Reading" (content/nodes/reading.yml): a title and a lead, then
 * a title, a text and a teaser, with known, short values. The snapshot is the
 * contract — if the structural output changes for any reason (template change,
 * turndown config tweak), the diff makes the change explicit. Inline so the
 * expectation lives next to the assertion.
 */
describe('agent: get_page_text', async () => {
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
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('renders the page as Markdown via providerElement + turndown', async () => {
    const result = await runAgentTool(page, 'get_page_text', {})

    expect(result.truncated).toBeUndefined()
    expect(result.text).toMatchInlineSnapshot(`
      "# Reading

      The lead of the page.

      ## A section

      A paragraph of text.

      [

      ### A teaser

      The lead of the teaser.

      ](/en/blocks)"
    `)
  })
})
