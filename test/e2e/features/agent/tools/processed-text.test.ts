import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { getHostContext, openEditor } from '../../../support/session'
import { addBlock } from '../../../support/blocks'
import { openSidebar } from '../../../support/sidebar'
import { setupEditorE2E } from '../../../support/setup'
import { runAgentTool, runComponentTool } from '../../../support/agent'
import { storedFieldValue } from '../../../support/editable'

/**
 * The agent must never see — let alone persist — a *processed* field value.
 *
 * A real CMS renders text through filters (Drupal text formats, typographic
 * transforms, "opens in a new tab" markers appended to external links). What is
 * rendered is NOT what is stored. The agent's read path
 * (`fieldValue.readValue` → `propsFieldMapping` → `element.innerHTML`) resolves
 * the *rendered* value, and every write basis is derived from that same read, so
 * an agent edit bakes the filter output into the stored value. Re-processing on
 * the next render then compounds it.
 *
 * The playground mock simulates this:
 * - `FieldTextarea.getPropValueItem` adds `data-bk-processed` to block elements
 * - `FieldText.getPropValueItem` applies typographic transforms (`--` → `—`)
 *
 * Both are deliberately non-idempotent, so corruption is directly assertable.
 * The raw values remain available through the adapter's `textFieldValues`
 * (mapped state) — read here via `storedFieldValue`, which is what would be
 * persisted.
 *
 * ── STATUS ─────────────────────────────────────────────────────────────────
 * Every case is `test.fails` — they document the CURRENT broken behaviour. The
 * agent-side raw read path (step 2) will make the bodies pass, at which point
 * vitest flips these red. Convert them to plain `test(...)` then; do not delete.
 *
 * `requireApproval: false` drives `update_text_fields` without its approval UI —
 * the tool applies on mount and `runComponentTool` resolves.
 */
describe('agent: processed text is never persisted', async () => {
  await setupEditorE2E()

  let page: Page
  let pageUuid: string

  beforeAll(async () => {
    page = await openEditor()
    // `runAgentTool`/`runComponentTool` only exist once the test-cases pane mounts.
    await openSidebar(page, 'test-cases')
    pageUuid = (await getHostContext(page)).uuid
  })

  afterAll(async () => {
    await page.close()
  })

  async function addTextBlock(): Promise<string> {
    const uuid = await addBlock(page, { bundle: 'text', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add text block')
    return uuid
  }

  test.fails('a query tool reports the raw markup, not the rendered one', async () => {
    const uuid = await addTextBlock()

    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === uuid)
    expect(
      entry,
      'text block should appear in get_all_page_content',
    ).toBeDefined()

    // The agent is shown `<p data-bk-processed>…` — the filter's output, which
    // it will happily echo back into a write.
    expect(entry!.text).not.toContain('data-bk-processed')
  })

  test.fails('a patch operation persists raw markup', async () => {
    const uuid = await addTextBlock()

    // `operations` applies search/replace to the field's CURRENT value, so the
    // whole field is rewritten with whatever that read returned.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        {
          uuid,
          fieldName: 'text',
          search: 'Lorem ipsum',
          replace: 'Ipsum lorem',
        },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, uuid, 'text'))
      .toContain('Ipsum lorem')

    const stored = await storedFieldValue(page, uuid, 'text')
    expect(stored).not.toContain('data-bk-processed')
  })

  test.fails('an agent edit does not compound the processing', async () => {
    const uuid = await addTextBlock()

    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'text', search: 'dolor', replace: 'colour' },
      ],
      requireApproval: false,
    })

    // Read the block's props off the state rather than the DOM: applying a diff
    // leaves the written value in `mutatedItemProps`, which masks the element
    // for the rest of the session. The state props are what the mock actually
    // re-rendered from the stored value — i.e. what the user sees on their next
    // visit.
    const renderedText = () =>
      page.evaluate((uuid) => {
        const item = window.__BLOKKLI__!.app!.state.getFieldListItem(uuid)
        return (item?.props as { text?: string })?.text ?? ''
      }, uuid)

    await expect.poll(renderedText).toContain('colour')

    // A stored value that already carries the filter output gets processed a
    // second time: `<p data-bk-processed data-bk-processed="">`. Every further
    // agent edit adds another one.
    expect(await renderedText()).not.toMatch(
      /data-bk-processed[^>]*data-bk-processed/,
    )
  })

  // LAST: mutates the shared host entity's `lead`, which every other test on
  // this page would otherwise see.
  test.fails('a patch on a plain host-entity field preserves the raw text', async () => {
    // Seed a value carrying an authoring mark the filter rewrites (`--` → `—`).
    // A full replacement sends an explicit value, so nothing is read here — the
    // stored value is exactly what we passed.
    await runComponentTool(page, 'update_text_fields', {
      updates: [{ uuid: pageUuid, fieldName: 'lead', value: 'Alpha -- Beta' }],
      requireApproval: false,
    })
    await expect
      .poll(() => storedFieldValue(page, pageUuid, 'lead'))
      .toBe('Alpha -- Beta')

    // Now force a read: the patch is applied to whatever the current value
    // resolves to. `lead` is mapped via `propsFieldMapping`, so that read comes
    // from `mutatedEntity` — the processed value.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid: pageUuid, fieldName: 'lead', search: 'Beta', replace: 'Gamma' },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, pageUuid, 'lead'))
      .toContain('Gamma')

    const stored = await storedFieldValue(page, pageUuid, 'lead')
    expect(stored).toContain('--')
    expect(stored).not.toContain('—')
  })
})
