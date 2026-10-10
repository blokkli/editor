import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../support/sidebar'
import { runAgentTool } from '../../../support/agent'
import type { MutationToolResult } from '#blokkli/agent/app/types'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import { editorPath, openEditor } from '../../../support/session'

// The columns of the page "Nested" (content/nodes/nested.yml): a title on the
// left, three texts on the right.
const COLUMNS = seedUuid('paragraph', 'columns')
const COLUMNS_TITLE = seedUuid('paragraph', 'columns-title')

async function duplicateParagraphs(
  page: Page,
  params: Parameters<typeof runAgentTool<'duplicate_paragraphs'>>[2],
): Promise<MutationToolResult> {
  return (await runAgentTool(
    page,
    'duplicate_paragraphs',
    params,
  )) as unknown as MutationToolResult
}

/**
 * `duplicate_paragraphs` clones a block AND its children. Before the tree
 * refactor it returned every cloned uuid as a flat sibling list — a model
 * duplicating columns containing a `text` would see `[{text}, {columns}]` and
 * could (and did, in the bug that motivated this) read it as misplaced output
 * and try to "fix" by deleting the work.
 *
 * Now `newParagraphs` is tree-shaped: cloned children appear under their
 * cloned parent's `children` keyed by paragraph field. This spec pins that
 * behaviour by duplicating seeded columns and asserting the duplicate result
 * mirrors their shape.
 */
describe('agent: duplicate_paragraphs result shape', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/nested', 'nested'),
    )
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('clones tree structure into newParagraphs', async () => {
    const result = await duplicateParagraphs(page, {
      uuids: [COLUMNS],
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    // ONE top-level entry — the duplicated columns. Their duplicated children
    // MUST appear nested, not as siblings.
    expect(result.newParagraphs).toBeDefined()
    expect(result.newParagraphs).toHaveLength(1)

    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('columns')
    // The duplicate is a NEW block, so its uuid differs from the source.
    expect(root.uuid).not.toBe(COLUMNS)

    expect(root.children).toBeDefined()
    expect(root.children!.field_left).toHaveLength(1)
    expect(root.children!.field_right).toHaveLength(3)

    const clonedTitle = root.children!.field_left![0]!
    expect(clonedTitle.bundle).toBe('title')
    // Duplicate has a fresh uuid for the child too.
    expect(clonedTitle.uuid).not.toBe(COLUMNS_TITLE)
    expect(clonedTitle.children).toBeUndefined()

    expect(root.children!.field_right!.map((child) => child.bundle)).toEqual([
      'text',
      'text',
      'text',
    ])
  })
})
