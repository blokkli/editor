import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { addBlocks, type NewBlockTree } from '../../support/blocks'
import { openSidebar } from '../../support/sidebar'
import { setupEditorE2E } from '../../support/setup'
import { runAgentTool } from '../../support/agent'

/**
 * E2E for the `get_page_text` tool — the DOM-based Markdown rendering of the
 * page that the agent should reach for whenever a prompt is about page
 * content/meaning (summarising, intro generation, translation).
 *
 * Reading from `ui.providerElement` + turndown means:
 *  - Content rendered via `propsFieldMapping` without a `v-blokkli-editable`
 *    directive is captured (it's in the DOM regardless — Card's `<p v-text>`).
 *  - Headings, paragraphs, lists keep their semantic structure as Markdown.
 *  - Referenced-entity content is included automatically because components
 *    render it.
 *
 * Strategy: wipe the page to a clean baseline, set known entity + block field
 * values, then snapshot the full Markdown. The snapshot is the contract — if
 * the structural output changes for any reason (template change, turndown
 * config tweak, propsFieldMapping resolution regressing), the diff makes the
 * change explicit. Inline so the expectation lives next to the assertion.
 */
describe('agent: get_page_text', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')

    // Reset the page to a clean baseline: delete every existing block (all
    // fields — hero buttons/icons + content), then overwrite the entity's
    // title + lead so the Hero renders deterministic text. The default
    // `/page/1` fixture is loaded with mock content that would otherwise
    // dominate the snapshot.
    await page.evaluate(async () => {
      const app = window.__BLOKKLI__!.app!
      const uuids = app.state.getAllUuids()
      if (uuids.length) {
        await app.state.mutateWithLoadingState(() =>
          app.adapter.deleteBlocks!(uuids),
        )
      }
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateEntityFieldValue!({
          fieldName: 'title',
          fieldValue: 'Snapshot Page',
        }),
      )
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateEntityFieldValue!({
          fieldName: 'lead',
          fieldValue: 'Lead text for the snapshot page.',
        }),
      )
    })

    // Add a deterministic block tree: title → text → card. Caller-supplied
    // uuids so we can address each block when overriding its field values.
    const tree: NewBlockTree[] = [
      { bundle: 'title', uuid: 'test-title-1' },
      { bundle: 'text', uuid: 'test-text-1' },
      { bundle: 'card', uuid: 'test-card-1' },
    ]
    await addBlocks(page, tree, { fieldName: 'content' })

    // Overwrite each block's content fields with known, short strings so the
    // snapshot is small, readable, and entirely under test control.
    await page.evaluate(async () => {
      const app = window.__BLOKKLI__!.app!
      const updates = [
        { uuid: 'test-title-1', fieldName: 'tagline', fieldValue: 'Topic Tag' },
        {
          uuid: 'test-title-1',
          fieldName: 'title',
          fieldValue: 'Section Heading',
        },
        {
          uuid: 'test-title-1',
          fieldName: 'lead',
          fieldValue: 'Section lead text.',
        },
        {
          uuid: 'test-text-1',
          fieldName: 'text',
          fieldValue: '<p>Body paragraph one.</p>',
        },
        {
          uuid: 'test-card-1',
          fieldName: 'title',
          fieldValue: 'Card Heading',
        },
        {
          uuid: 'test-card-1',
          fieldName: 'text',
          fieldValue: 'Card body text.',
        },
      ]
      for (const u of updates) {
        await app.state.mutateWithLoadingState(() =>
          app.adapter.updateFieldValue!(u),
        )
      }
    })
  })

  afterAll(async () => {
    await page.close()
  })

  test('renders the page as Markdown via providerElement + turndown', async () => {
    const result = await runAgentTool(page, 'get_page_text', {})

    expect(result.truncated).toBeUndefined()
    expect(result.text).toMatchInlineSnapshot(`
      "# 

      Snapshot Page

      Lead text for the snapshot page.

      -   Section Heading

      Topic Tag

      ## Section Heading

      Section lead text.

      Body paragraph one.

      ### Card Heading

      Card body text."
    `)
  })
})
