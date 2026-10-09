import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../../../../e2e/support/session'
import { openSidebar } from '../../../../e2e/support/sidebar'
import { runAgentTool } from '../../../../e2e/support/agent'
import type { MutationToolResult } from '#blokkli/agent/app/types'
import {
  resetSandbox,
  sandboxHost,
  workerSandbox,
} from '../../../support/sandbox'
import { editorPath, openEditor } from '../../../support/session'

/**
 * The tool's *declared* result schema is the prepare-phase mutation action
 * (`{ type, label }`), but at runtime — both via the production tool dispatch
 * and via the test-cases `runAgentTool` — what's returned is the success
 * envelope built by `buildMutationResult` /`buildNewParagraphsTree`. Coerce
 * the call site to the runtime shape so assertions read naturally.
 */
async function addParagraphs(
  page: Page,
  params: Parameters<typeof runAgentTool<'add_paragraphs'>>[2],
): Promise<MutationToolResult> {
  return (await runAgentTool(
    page,
    'add_paragraphs',
    params,
  )) as unknown as MutationToolResult
}

/**
 * Regression test for the agent's `add_paragraphs` tool result shape.
 *
 * The success payload used to return a FLAT `newParagraphs` array containing
 * every newly-created block — top-level adds and nested children mixed
 * together. A model that asked for one accordion wrapping one text would see
 * `[{bundle: text}, {bundle: accordion}]` come back and could (and did) read
 * that as a failed structural add, then delete its own work.
 *
 * Fix: nest children under each parent's `children` keyed by paragraph field
 * name, so the response mirrors the input shape and round-trips cleanly. The
 * runtime path goes through `toolsProvider.buildMutationResult`; the
 * test-cases feature wires `runAgentTool` through the same
 * `buildNewParagraphsTree` helper, so this spec pins the production code.
 *
 * On the empty page (content/nodes/empty.yml).
 */
describe('agent: add_paragraphs result shape', async () => {
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
    // The test-cases sidebar registers `runAgentTool` on `window.__BLOKKLI__.test`
    // only once its pane mounts.
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('nests child paragraphs under the parent in newParagraphs', async () => {
    const { entityType, entityUuid } = await withApp(page, (app) => ({
      entityType: app.context.value.entityType,
      entityUuid: app.context.value.entityUuid,
    }))

    const result = await addParagraphs(page, {
      paragraphs: [
        {
          bundle: 'columns',
          children: {
            field_left: [
              {
                bundle: 'text',
                contentFields: { field_text: '<p>Hello from left.</p>' },
              },
            ],
          },
        },
      ],
      parent: { type: entityType, uuid: entityUuid, field: 'field_paragraphs' },
      position: 'end',
    })

    // Success envelope.
    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    // Exactly ONE top-level entry — the columns. The nested text must NOT
    // appear as a sibling (the bug we're guarding against).
    expect(result.newParagraphs).toBeDefined()
    expect(result.newParagraphs).toHaveLength(1)

    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('columns')

    // The text lives under `children.field_left[0]`, mirroring the input
    // shape.
    expect(root.children).toBeDefined()
    expect(root.children!.field_left).toBeDefined()
    expect(root.children!.field_left).toHaveLength(1)
    expect(root.children!.field_left![0]!.bundle).toBe('text')
    expect(root.children!.field_left![0]!.uuid).toBeTruthy()
    // The child entry has no children of its own — a leaf text block.
    expect(root.children!.field_left![0]!.children).toBeUndefined()

    // Sanity: the IDs in newParagraphs match the blocks now in the editor.
    const liveBundles = await page.evaluate(
      ({ rootUuid, childUuid }) => {
        const app = window.__BLOKKLI__!.app!
        return {
          root: app.blocks.getBlock(rootUuid)?.bundle ?? null,
          child: app.blocks.getBlock(childUuid)?.bundle ?? null,
        }
      },
      { rootUuid: root.uuid, childUuid: root.children!.field_left![0]!.uuid },
    )
    expect(liveBundles.root).toBe('columns')
    expect(liveBundles.child).toBe('text')
  })

  test('round-trips a 3-level deep nest', async () => {
    const { entityType, entityUuid } = await withApp(page, (app) => ({
      entityType: app.context.value.entityType,
      entityUuid: app.context.value.entityUuid,
    }))

    const result = await addParagraphs(page, {
      paragraphs: [
        {
          bundle: 'accordion',
          children: {
            field_paragraphs: [
              {
                bundle: 'columns',
                children: {
                  field_left: [{ bundle: 'text' }, { bundle: 'text' }],
                },
              },
            ],
          },
        },
      ],
      parent: { type: entityType, uuid: entityUuid, field: 'field_paragraphs' },
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    expect(result.newParagraphs).toHaveLength(1)
    const root = result.newParagraphs![0]!
    expect(root.bundle).toBe('accordion')

    const columns = root.children?.field_paragraphs?.[0]
    expect(columns?.bundle).toBe('columns')

    const texts = columns?.children?.field_left
    expect(texts).toHaveLength(2)
    expect(texts![0]!.bundle).toBe('text')
    expect(texts![1]!.bundle).toBe('text')
  })

  test('keeps multiple top-level adds at the root', async () => {
    // When the model adds two unrelated paragraphs side by side, both must stay
    // at the root of newParagraphs — neither parents the other.
    const { entityType, entityUuid } = await withApp(page, (app) => ({
      entityType: app.context.value.entityType,
      entityUuid: app.context.value.entityUuid,
    }))

    const result = await addParagraphs(page, {
      paragraphs: [
        { bundle: 'title' },
        { bundle: 'text', contentFields: { field_text: '<p>Body.</p>' } },
      ],
      parent: { type: entityType, uuid: entityUuid, field: 'field_paragraphs' },
      position: 'end',
    })

    if (!('success' in result) || result.success !== true) {
      throw new Error(
        `Expected success, got: ${JSON.stringify(result, null, 2)}`,
      )
    }

    expect(result.newParagraphs).toHaveLength(2)
    const bundles = result.newParagraphs!.map((p) => p.bundle)
    expect(bundles).toContain('title')
    expect(bundles).toContain('text')
    // Neither should have nested children.
    expect(result.newParagraphs![0]!.children).toBeUndefined()
    expect(result.newParagraphs![1]!.children).toBeUndefined()
  })
})
