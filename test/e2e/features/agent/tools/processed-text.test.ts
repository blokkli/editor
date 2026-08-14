import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { getHostContext, openEditor } from '../../../support/session'
import { addBlock } from '../../../support/blocks'
import { openSidebar } from '../../../support/sidebar'
import { setupEditorE2E } from '../../../support/setup'
import { runAgentTool, runComponentTool } from '../../../support/agent'
import {
  openEditableField,
  plaintextEditor,
  storedFieldValue,
} from '../../../support/editable'
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
 * Complete. The agent reads field values through `fieldValue.readRawValue`, and
 * the DOM-derived tools either report stored values (`search_text`,
 * `find_paragraphs`) or declare their provenance on the payload
 * (`get_page_text`). Every case is a plain `test(...)`; there is nothing left
 * documenting broken behaviour.
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

  /**
   * The case that motivated all of this: a link the backend rewrites while
   * rendering. Processing resolves `/node/123` to a path alias and appends a
   * visible "opens in a new tab" hint after the anchor.
   */
  const RAW_LINK =
    '<p>Mehr <a href="/node/123" target="_blank">im Angebot</a> lesen.</p>'

  const MARKUP_MARKER = 'data-bk-processed'
  const PLAIN_MARKER = '—'
  /** Node insertion — the only marker visible to `textContent`. */
  const LINK_TEXT_MARKER = '(opens in a new tab)'
  /** Attribute rewriting — visible only in markup. */
  const LINK_HREF_MARKER = '/alias-123'

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

  test('readRawValue returns the stored field value', async () => {
    // The provider-level contract underneath every tool below — and the read
    // basis `delegate_text_rewrite` turns into its `baseValue`, which has no
    // reachable E2E seam of its own (its rewrite streams from a real LLM route).
    const values = await page.evaluate(
      ({ uuid, bundle }) => {
        const fieldValue = window.__BLOKKLI__!.app!.fieldValue
        const args = ['paragraph', uuid, bundle, 'text', 'markup'] as const
        return {
          raw: fieldValue.readRawValue(...args),
          rendered: fieldValue.readValue(...args),
        }
      },
      { uuid: markupUuid, bundle: 'text' },
    )
    expect(values.raw).toBe(RAW_MARKUP)
    // `readValue` is deliberately left alone — the editor's preview machinery
    // restores what was on screen, so it must keep returning the rendered value.
    expect(values.rendered).toContain(MARKUP_MARKER)
  })

  test('get_all_page_content reports raw markup', async () => {
    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === markupUuid)
    expect(
      entry,
      'text block should appear in get_all_page_content',
    ).toBeDefined()
    expect(entry!.text).not.toContain(MARKUP_MARKER)
  })

  test('get_paragraph_context reports raw markup', async () => {
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

  test('get_content_fields reports raw markup for a block', async () => {
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

  test('get_content_fields reports raw plain text for an entity field', async () => {
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

  test('get_page_structure reports raw block content', async () => {
    const result = await runAgentTool(page, 'get_page_structure', {
      uuid: markupUuid,
    })
    // The structure is an XML string; field values are XML-escaped, but the
    // attribute name survives escaping intact.
    expect(result.structure).not.toContain(MARKUP_MARKER)
  })

  test('get_page_structure reports raw entity content', async () => {
    const result = await runAgentTool(page, 'get_page_structure', {})
    expect(result.structure, 'lead should appear in the structure').toContain(
      'Alpha',
    )
    expect(result.structure).not.toContain(PLAIN_MARKER)
  })

  // ── DOM-derived reads ─────────────────────────────────────────────────────
  // These read the rendered page, which no raw read path reaches. `get_page_text`
  // stays that way on purpose — it is the only tool that captures content
  // belonging to no field (a block that fetches its own data, backend-generated
  // markup). The other two search the rendered page for RECALL but must not hand
  // back rendered text the model could use as an edit target.

  test('get_page_text is rendered text, and says so', async () => {
    const result = await runAgentTool(page, 'get_page_text', {})
    // Deliberately still processed: this is what the user sees. Inverted from a
    // `test.fails` so nobody "fixes" it into a raw read and loses the coverage
    // of non-field content that is the whole point of the tool.
    expect(result.text).toContain(PLAIN_MARKER)
    // The payload has to carry its own provenance — a tool description is read
    // once, far from the point of use.
    expect(result.source).toBe('rendered')
  })

  test('search_text returns stored snippets for field matches', async () => {
    const result = await runAgentTool(page, 'search_text', {
      query: 'Alpha',
      limit: 20,
    })
    const match = result.matches.find((r) => r.uuid === plainUuid)
    expect(match, 'seeded card should match the query').toBeDefined()
    // The snippet is a real substring of the stored value, so the model can
    // reuse it as a search/replace target.
    expect(match!.source).toBe('field')
    expect(match!.fieldName).toBe('title')
    expect(match!.matchedText).not.toContain(PLAIN_MARKER)
    expect(RAW_PLAIN).toContain(
      match!.matchedText.replace(/^\.\.\.|\.\.\.$/g, ''),
    )
  })

  test('find_paragraphs matches containsText against raw text', async () => {
    // The model builds `containsText` from a value some other tool showed it,
    // and those tools report stored values.
    const result = await runAgentTool(page, 'find_paragraphs', {
      containsText: RAW_PLAIN,
      limit: 50,
    })
    expect(result.paragraphs.map((p) => p.uuid)).toContain(plainUuid)
  })

  // ── Writes: what gets persisted ───────────────────────────────────────────

  test('a patch operation persists raw markup', async () => {
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

  test('a partially accepted diff persists a raw hybrid', async () => {
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

  test('a rewritten link is read with its stored href and no inserted hint', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_LINK)

    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [uuid],
      includeNested: false,
    })
    const json = JSON.stringify(result)
    expect(json).toContain('/node/123')
    expect(json).not.toContain(LINK_HREF_MARKER)
    expect(json).not.toContain(LINK_TEXT_MARKER)
  })

  test('editing around a rewritten link keeps the stored href intact', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_LINK)

    // Touch text outside the anchor. The whole field is still rewritten on
    // apply, so a rendered read basis would bake in both the alias and the hint.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'text', search: 'lesen', replace: 'entdecken' },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, uuid, 'text'))
      .toContain('entdecken')
    const stored = await storedFieldValue(page, uuid, 'text')
    expect(stored).toContain('href="/node/123"')
    expect(stored).not.toContain(LINK_HREF_MARKER)
    expect(stored).not.toContain(LINK_TEXT_MARKER)
    expect(stored).not.toContain(MARKUP_MARKER)
  })

  test('get_page_text still reports the inserted hint as rendered text', async () => {
    // The counterpart to the read test above: the hint is genuinely part of the
    // page, and `get_page_text` is the tool that must keep showing it — with
    // `source: 'rendered'` so the model knows it cannot be used as an edit
    // target. Pinning it here stops anyone "fixing" this into a raw read.
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_LINK)

    const result = await runAgentTool(page, 'get_page_text', {})
    expect(result.source).toBe('rendered')
    expect(result.text).toContain(LINK_TEXT_MARKER)
  })

  test('opening a component editable seeds the stored value', async () => {
    // `<BlokkliEditable>` — the documented Drupal pattern, and the path a
    // HUMAN uses — seeded its editor from the rendered prop, so opening a field
    // and saving persisted the filter output even without the agent involved.
    await seedField(pageUuid, 'title', RAW_PLAIN)
    await openEditableField(page, 'title', pageUuid)

    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    const seeded = await editor.inputValue()
    expect(seeded).toContain('--')
    expect(seeded).not.toContain(PLAIN_MARKER)

    await page.keyboard.press('Escape')
  })

  test('an agent edit does not compound the processing', async () => {
    const uuid = await addTextBlock()
    await seedField(uuid, 'text', RAW_MARKUP)

    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'text', search: 'Omega', replace: 'Sigma' },
      ],
      requireApproval: false,
    })

    // Read the block's props off the state, NOT the DOM. The DOM cannot show
    // this bug: `<p data-bk-processed data-bk-processed="">` is invalid HTML,
    // and the parser silently drops the duplicate attribute, so the element
    // looks identical to a singly-processed one. The state props carry the
    // value the mock actually produced from the stored value.
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
  test('a patch on a plain host-entity field preserves the raw text', async () => {
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
