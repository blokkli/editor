import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, editorPath, openEditor } from '../../../support/session'
import { openSidebar } from '../../../support/sidebar'
import { runAgentTool } from '../../../support/agent'
import type { MutationToolResult } from '#blokkli/agent/app/types'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'

// The template "Two texts on the left" (content/templates.yml): columns with
// two texts in `field_left`.
const TEMPLATE = seedUuid('blokkli_paragraph_template', 'two-texts-left')

async function addTemplate(
  page: Page,
  params: Parameters<typeof runAgentTool<'add_template'>>[2],
): Promise<MutationToolResult> {
  return (await runAgentTool(
    page,
    'add_template',
    params,
  )) as unknown as MutationToolResult
}

/**
 * `add_template` clones a saved template — with all its nested blocks — onto
 * a parent field. Same flat-vs-tree response trap as `add_paragraphs` /
 * `duplicate_paragraphs`: a template containing columns with a child `text`
 * produced `[{text}, {columns}]` in the old format. The model couldn't tell
 * the text was the columns' content and could (and did) "correct" the
 * structure by deleting blocks.
 *
 * This spec adds a seeded template to the empty page (content/nodes/empty.yml)
 * and asserts `add_template` returns a tree-shaped `newParagraphs`.
 */
describe('agent: add_template result shape', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/empty', 'empty'),
    )
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('clones template tree into newParagraphs', async () => {
    const host = await withApp(page, (app) => ({
      type: app.context.value.entityType,
      uuid: app.context.value.entityUuid,
    }))

    const result = await addTemplate(page, {
      templateUuid: TEMPLATE,
      parent: { type: host.type, uuid: host.uuid, field: 'field_paragraphs' },
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    // ONE top-level entry — the cloned columns. The cloned texts MUST appear
    // nested under `children.field_left`, not as siblings.
    expect(result.newParagraphs).toBeDefined()
    expect(result.newParagraphs).toHaveLength(1)

    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('columns')
    expect(root.uuid).toBeTruthy()

    expect(root.children).toBeDefined()
    expect(root.children!.field_left).toHaveLength(2)
    // Each cloned child has a uuid and the template's bundle.
    for (const child of root.children!.field_left!) {
      expect(child.uuid).toBeTruthy()
      expect(child.bundle).toBe('text')
    }
  })
})
