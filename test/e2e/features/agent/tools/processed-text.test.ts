import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { getHostContext, openEditor } from '../../../support/session'
import { addBlock } from '../../../support/blocks'
import { openSidebar } from '../../../support/sidebar'
import { setupEditorE2E } from '../../../support/setup'
import { runAgentTool, runComponentTool } from '../../../support/agent'
import { storedFieldValue } from '../../../support/editable'
import { applyDiff } from '../../../support/diff'

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
 * Most cases are `test.fails` — they document the CURRENT broken behaviour and
 * will flip red once the agent reads raw values (step 2). Convert those to plain
 * `test(...)` then; do not delete. The handful of plain `test(...)` cases at the
 * bottom pin paths that are ALREADY correct and must stay that way.
 *
 * `requireApproval: false` drives `update_text_fields` without its approval UI —
 * the tool applies on mount and `runComponentTool` resolves.
 */
describe('agent: text field values are always unprocessed', async () => {
  await setupEditorE2E()

  /** Raw markup fixture. Processing would add `data-bk-processed` to the `<p>`. */
  const RAW_MARKUP = '<p>Alpha and Omega</p><p>Beta and Gamma</p>'
  /** Raw plain-text fixture. Processing would turn `--` into an em dash. */
  const RAW_PLAIN = 'Alpha -- Beta'

  const MARKUP_MARKER = 'data-bk-processed'
  const PLAIN_MARKER = '—'

  let page: Page
  let pageUuid: string
  /** `text` block seeded with RAW_MARKUP — shared by the read-only cases. */
  let markupUuid: string
  /** `card` block seeded with RAW_PLAIN in `title` — shared by the read-only cases. */
  let plainUuid: string

  /**
   * Write a known raw value into a field. Full replacement sends an explicit
   * value, so nothing is read — the stored value is exactly what we pass, which
   * is what makes it a trustworthy fixture for the read assertions.
   */
  async function seedField(
    uuid: string,
    fieldName: string,
    value: string,
  ): Promise<void> {
    await runComponentTool(page, 'update_text_fields', {
      updates: [{ uuid, fieldName, value }],
      requireApproval: false,
    })
    // `waitForFunction` rather than `expect.poll` — seeding runs in `beforeAll`,
    // where vitest's poll is unavailable (it must be called inside a test).
    await page.waitForFunction(
      ({ uuid, fieldName, value }) =>
        window
          .__BLOKKLI__!.app!.fieldValue.getTextFieldValues()
          .find((v) => v.uuid === uuid && v.fieldName === fieldName)?.value ===
        value,
      { uuid, fieldName, value },
    )
  }

  async function addTextBlock(): Promise<string> {
    const uuid = await addBlock(page, { bundle: 'text', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add text block')
    return uuid
  }

  beforeAll(async () => {
    page = await openEditor()
    // `runAgentTool`/`runComponentTool` only exist once the test-cases pane mounts.
    await openSidebar(page, 'test-cases')
    pageUuid = (await getHostContext(page)).uuid

    markupUuid = await addTextBlock()
    await seedField(markupUuid, 'text', RAW_MARKUP)

    const card = await addBlock(page, { bundle: 'card', fieldName: 'content' })
    if (!card) throw new Error('Failed to add card block')
    plainUuid = card
    await seedField(plainUuid, 'title', RAW_PLAIN)

    // The host entity's `lead` is the entity-level fixture. It is mapped via
    // `propsFieldMapping` in the playground page component, so reads of it
    // resolve through `mutatedEntity` rather than the DOM.
    await seedField(pageUuid, 'lead', RAW_PLAIN)
  })

  afterAll(async () => {
    await page.close()
  })

  // ── Reads: what the model is shown ────────────────────────────────────────
  // All of these resolve through `fieldValue.readValue` /
  // `readBlockContentFields`, so they share one root cause.

  test.fails('readValue returns the raw field value', async () => {
    // The provider-level contract underneath every tool below — and the read
    // basis `delegate_text_rewrite` turns into its `baseValue`, which has no
    // reachable E2E seam of its own (its rewrite streams from a real LLM route).
    const value = await page.evaluate(
      ({ uuid, bundle }) =>
        window.__BLOKKLI__!.app!.fieldValue.readValue(
          'paragraph',
          uuid,
          bundle,
          'text',
          'markup',
        ),
      { uuid: markupUuid, bundle: 'text' },
    )
    expect(value).not.toContain(MARKUP_MARKER)
  })

  test.fails('get_all_page_content reports raw markup', async () => {
    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === markupUuid)
    expect(
      entry,
      'text block should appear in get_all_page_content',
    ).toBeDefined()
    expect(entry!.text).not.toContain(MARKUP_MARKER)
  })

  test.fails('get_paragraph_context reports raw markup', async () => {
    const result = await runAgentTool(page, 'get_paragraph_context', {
      uuid: markupUuid,
      includeContentFields: true,
      includeParentChain: false,
      includeSiblings: false,
      includeChildren: false,
      includeOptions: false,
    })
    expect(JSON.stringify(result)).not.toContain(MARKUP_MARKER)
  })

  test.fails('get_content_fields reports raw markup for a block', async () => {
    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [markupUuid],
      includeNested: false,
    })
    const field = result[markupUuid]?.text
    expect(field, 'text field should be present').toBeDefined()
    expect(
      (field as { currentValue?: string }).currentValue ?? '',
    ).not.toContain(MARKUP_MARKER)
  })

  test.fails('get_content_fields reports raw plain text for an entity field', async () => {
    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [pageUuid],
      includeNested: false,
    })
    const field = result[pageUuid]?.lead
    expect(field, 'lead field should be present').toBeDefined()
    expect(
      (field as { currentValue?: string }).currentValue ?? '',
    ).not.toContain(PLAIN_MARKER)
  })

  test.fails('get_page_structure reports raw block content', async () => {
    const result = await runAgentTool(page, 'get_page_structure', {
      uuid: markupUuid,
    })
    // The structure is an XML string; field values are XML-escaped, but the
    // attribute name survives escaping intact.
    expect(result.structure).not.toContain(MARKUP_MARKER)
  })

  test.fails('get_page_structure reports raw entity content', async () => {
    const result = await runAgentTool(page, 'get_page_structure', {})
    expect(result.structure, 'lead should appear in the structure').toContain(
      'Alpha',
    )
    expect(result.structure).not.toContain(PLAIN_MARKER)
  })

  // ── DOM-derived reads ─────────────────────────────────────────────────────
  // These bypass `readValue` entirely and read the rendered page, so a raw read
  // path does NOT reach them. Pinned here so the leak stays visible; what to do
  // about them is an open decision.

  test.fails('get_page_text reports raw text', async () => {
    const result = await runAgentTool(page, 'get_page_text', {})
    expect(result.text).not.toContain(PLAIN_MARKER)
  })

  test.fails('search_text returns raw match snippets', async () => {
    const result = await runAgentTool(page, 'search_text', {
      query: 'Alpha',
      limit: 20,
    })
    const match = result.matches.find((r) => r.uuid === plainUuid)
    expect(match, 'seeded card should match the query').toBeDefined()
    expect(match!.matchedText).not.toContain(PLAIN_MARKER)
  })

  test.fails('find_paragraphs matches containsText against raw text', async () => {
    // The model builds `containsText` from a value some other tool showed it.
    // Filtering against the rendered text means the raw authoring marks miss.
    const result = await runAgentTool(page, 'find_paragraphs', {
      containsText: RAW_PLAIN,
      limit: 50,
    })
    expect(result.paragraphs.map((p) => p.uuid)).toContain(plainUuid)
  })

  // ── Writes: what gets persisted ───────────────────────────────────────────

  test.fails('a patch operation persists raw markup', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_MARKUP)

    // `operations` applies search/replace to the field's CURRENT value, so the
    // whole field is rewritten with whatever that read returned.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'text', search: 'Omega', replace: 'Sigma' },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, uuid, 'text'))
      .toContain('Sigma')
    expect(await storedFieldValue(page, uuid, 'text')).not.toContain(
      MARKUP_MARKER,
    )
  })

  test.fails('a partially accepted diff persists a raw hybrid', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_MARKUP)

    // Rejecting one chunk reassembles the field from the REJECTED chunk's
    // "before" value spliced together with the accepted new chunk — and that
    // before value comes from the processed read.
    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid,
          fieldName: 'text',
          value: '<p>Alpha and Sigma</p><p>Beta and Delta</p>',
        },
      ],
    })

    const items = page.locator('[data-test="diff-approval-highlight-item"]')
    await items.first().waitFor({ state: 'visible' })
    await items.first().locator('button').first().click() // activate
    await items.first().locator('button').nth(1).waitFor({ state: 'visible' })
    await items.first().locator('button').nth(1).click() // toggle → reject
    await expect
      .poll(() => items.first().getAttribute('data-test-selected'))
      .toBe('false')

    await applyDiff(page)
    await done

    await expect
      .poll(() => storedFieldValue(page, uuid, 'text'))
      .toContain('Delta')
    expect(await storedFieldValue(page, uuid, 'text')).not.toContain(
      MARKUP_MARKER,
    )
  })

  test.fails('an agent edit does not compound the processing', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_MARKUP)

    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'text', search: 'Omega', replace: 'Sigma' },
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

    await expect.poll(renderedText).toContain('Sigma')

    // A stored value that already carries the filter output gets processed a
    // second time: `<p data-bk-processed data-bk-processed="">`. Every further
    // agent edit adds another one.
    expect(await renderedText()).not.toMatch(
      /data-bk-processed[^>]*data-bk-processed/,
    )
  })

  // ── Paths that are ALREADY correct ────────────────────────────────────────
  // Plain `test` on purpose: these read the adapter's raw `textFieldValues`
  // rather than the rendered value, and must keep doing so.

  test('getTextFieldValues exposes raw values', async () => {
    expect(await storedFieldValue(page, markupUuid, 'text')).toBe(RAW_MARKUP)
    expect(await storedFieldValue(page, plainUuid, 'title')).toBe(RAW_PLAIN)
  })

  test('get_readability_issues analyses raw values', async () => {
    const result = await runAgentTool(page, 'get_readability_issues', {})
    expect(JSON.stringify(result)).not.toContain(MARKUP_MARKER)
  })

  // LAST: mutates the shared host entity's `lead`, which the read cases above
  // depend on being exactly RAW_PLAIN.
  test.fails('a patch on a plain host-entity field preserves the raw text', async () => {
    // Force a read: the patch is applied to whatever the current value
    // resolves to. `lead` is mapped via `propsFieldMapping`, so that read
    // comes from `mutatedEntity` — the processed value.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        {
          uuid: pageUuid,
          fieldName: 'lead',
          search: 'Beta',
          replace: 'Gamma',
        },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, pageUuid, 'lead'))
      .toContain('Gamma')

    const stored = await storedFieldValue(page, pageUuid, 'lead')
    expect(stored).toContain('--')
    expect(stored).not.toContain(PLAIN_MARKER)
  })
})
