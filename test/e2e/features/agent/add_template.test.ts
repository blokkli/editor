import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from '../../support/session'
import { openSidebar } from '../../support/sidebar'
import { setupEditorE2E } from '../../support/setup'
import { runAgentTool } from '../../support/agent'
import type { MutationToolResult } from '#blokkli/agent/app/types'

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
 * `duplicate_paragraphs`: a template containing a `two_columns` with a child
 * `text` produced `[{text}, {two_columns}]` in the old format. The model
 * couldn't tell the text was the accordion's body and could (and did)
 * "correct" the structure by deleting blocks.
 *
 * This spec seeds a nested tree, snapshots it as a template via the production
 * `templatesCreate` adapter call, discovers the template's uuid through
 * `templatesSearch` (mirroring the real `search_templates` → `add_template`
 * agent flow), then asserts `add_template` returns a tree-shaped
 * `newParagraphs`.
 */
describe('agent: add_template result shape', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('clones template tree into newParagraphs', async () => {
    // 1. Locate a pre-seeded `two_columns` block on the page that already has
    //    a child somewhere — the seeded entities are the only blocks whose
    //    persisted field lists include their child uuids. (Blocks added via
    //    `addNewBlocks` only register parent↔child via proxies, so the mock's
    //    `templatesCreate` — which walks the source entity — would snapshot
    //    them with empty fields, defeating the test.)
    const sourceParentInfo = await page.evaluate(() => {
      const app = window.__BLOKKLI__!.app!
      for (const uuid of app.state.getAllUuids()) {
        const block = app.blocks.getBlock(uuid)
        if (block?.bundle !== 'two_columns') continue
        // We need a top-level two_columns (host is the root entity).
        if (block.host.type === 'paragraph') continue
        // Pick one whose `left` field has at least one child block.
        const childKey = `${uuid}:left`
        const count = app.state.getFieldBlockCount(childKey)
        if (count >= 1) {
          return { uuid, childCount: count }
        }
      }
      return null
    })
    if (!sourceParentInfo) {
      throw new Error(
        'No pre-seeded two_columns with children found on /page/1 — playground data drifted.',
      )
    }

    // 2. Snapshot it as a template via the production adapter call.
    const templateLabel = `e2e-tmpl-${Date.now()}`
    await page.evaluate(
      async ({ label, uuids }) => {
        const app = window.__BLOKKLI__!.app!
        await app.state.mutateWithLoadingState(() =>
          app.adapter.templatesCreate!({ label, uuids }),
        )
      },
      { label: templateLabel, uuids: [sourceParentInfo.uuid] },
    )

    // 3. Discover the template uuid through the same search the agent would
    //    use (`search_templates` is a thin wrapper over `templatesSearch`).
    const hostCtx = await withApp(page, (app) => ({
      type: app.context.value.entityType,
      uuid: app.context.value.entityUuid,
    }))
    const templateUuid = await page.evaluate(
      async ({ label, host }) => {
        const app = window.__BLOKKLI__!.app!
        const result = await app.adapter.templatesSearch!({
          page: 0,
          filters: { text: label },
          host: { type: host.type, uuid: host.uuid, fieldName: 'content' },
          includeItems: false,
        })
        return result.items.find((t) => t.label === label)?.uuid ?? null
      },
      { label: templateLabel, host: hostCtx },
    )
    if (!templateUuid) throw new Error('Seeded template not found')

    // 4. Add the template — the path being regression-tested.
    const result = await addTemplate(page, {
      templateUuid,
      parent: { type: hostCtx.type, uuid: hostCtx.uuid, field: 'content' },
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    // ONE top-level entry — the cloned two_columns. The cloned children MUST
    // appear nested under `children.left`, not as siblings.
    expect(result.newParagraphs).toBeDefined()
    expect(result.newParagraphs).toHaveLength(1)

    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('two_columns')
    // Fresh uuid — not the source page uuid.
    expect(root.uuid).not.toBe(sourceParentInfo.uuid)

    expect(root.children).toBeDefined()
    // The seeded source's `left` had N children — the clone must reproduce that.
    expect(root.children!.left).toBeDefined()
    expect(root.children!.left!.length).toBe(sourceParentInfo.childCount)
    // Each cloned child has a fresh uuid and a valid bundle.
    for (const child of root.children!.left!) {
      expect(child.uuid).toBeTruthy()
      expect(child.bundle).toBeTruthy()
    }
  })
})
