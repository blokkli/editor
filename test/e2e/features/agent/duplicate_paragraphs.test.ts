import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { addBlocks } from '../../support/blocks'
import { openSidebar } from '../../support/sidebar'
import { setupEditorE2E } from '../../support/setup'
import { runAgentTool } from '../../support/agent'
import type { MutationToolResult } from '#blokkli/agent/app/types'

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
 * duplicating a `two_columns` containing a `text` would see `[{text},
 * {two_columns}]` and could (and did, in the bug that motivated this) read it
 * as misplaced output and try to "fix" by deleting the work.
 *
 * Now `newParagraphs` is tree-shaped: cloned children appear under their
 * cloned parent's `children` keyed by paragraph field. This spec pins that
 * behaviour by seeding a deterministic nested tree on the page and asserting
 * the duplicate result mirrors the input shape.
 */
describe('agent: duplicate_paragraphs result shape', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('clones tree structure into newParagraphs', async () => {
    // Seed a two_columns with a known child layout. Caller-provided uuids let
    // the test target the parent directly without diffing state.
    const parentUuid = 'e2e-dup-tree-parent'
    const childUuid = 'e2e-dup-tree-child'
    await addBlocks(page, [
      {
        bundle: 'two_columns',
        uuid: parentUuid,
        children: {
          left: [{ bundle: 'text', uuid: childUuid }],
        },
      },
    ])

    const result = await duplicateParagraphs(page, {
      uuids: [parentUuid],
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    // ONE top-level entry — the duplicated two_columns. The duplicated child
    // text MUST appear nested, not as a sibling.
    expect(result.newParagraphs).toBeDefined()
    expect(result.newParagraphs).toHaveLength(1)

    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('two_columns')
    // The duplicate is a NEW block, so its uuid differs from the source.
    expect(root.uuid).not.toBe(parentUuid)

    expect(root.children).toBeDefined()
    expect(root.children!.left).toBeDefined()
    expect(root.children!.left).toHaveLength(1)

    const clonedChild = root.children!.left![0]!
    expect(clonedChild.bundle).toBe('text')
    // Duplicate has a fresh uuid for the child too.
    expect(clonedChild.uuid).not.toBe(childUuid)
    expect(clonedChild.children).toBeUndefined()
  })
})
