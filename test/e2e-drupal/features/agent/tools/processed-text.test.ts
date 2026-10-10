import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../../../e2e/support/sidebar'
import { runAgentTool, runComponentTool } from '../../../../e2e/support/agent'
import { storedFieldValue } from '../../../../e2e/support/editable'
import { applyDiff } from '../../../../e2e/support/diff'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../../support/sandbox'
import { editorPath, openEditor } from '../../../support/session'

/**
 * The agent must never see — let alone persist — a *processed* field value.
 *
 * Drupal renders a text through its text format, and what is rendered is NOT
 * what is stored: basic_html's external-link filter gives each link to another
 * site `target="_blank"` and appends a visually hidden "(opens in a new tab)".
 * The agent's read path (`fieldValue.readValue` → `propsFieldMapping` →
 * `element.innerHTML`) resolves the *rendered* value, and every write basis is
 * derived from that same read, so an agent edit would bake the filter output
 * into the stored value. Re-processing on the next render then compounds it:
 * `filter_html` strips the stored hint's `<span>` but keeps its text, and the
 * filter appends another.
 *
 * The filter does two of the things a text format does, each detectable
 * through a different read path: it injects an attribute (`target`, only
 * visible in markup) and inserts nodes (the hint, also visible to
 * `textContent`, turndown and readability chunking). The texts of the page
 * "Links" (content/nodes/links.yml) are the fixture; the raw values are
 * available through the adapter's `textFieldValues` (read via
 * `storedFieldValue`), which is what Drupal stores.
 *
 * The plain-string cases stay with the mock (`test/e2e/features/agent/tools/
 * processed-text`): Drupal never processes a plain string.
 *
 * `requireApproval: false` drives `update_text_fields` without its approval UI —
 * the tool applies on mount and `runComponentTool` resolves.
 *
 * Page lifecycle: one editor page with the `test-cases` sidebar open. The reads
 * share one text; each write changes its own.
 */
describe('agent: text field values are always unprocessed', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  /** Every text's stored value. */
  const RAW =
    '<p>Alpha and <a href="https://www.example.com">Omega</a></p><p>Beta and Gamma</p>'

  /** Node insertion — the only marker visible to `textContent`. */
  const HINT = '(opens in a new tab)'
  /** Attribute injection — visible only in markup (also once JSON-escaped). */
  const TARGET = '_blank'

  /** The text the reads share. */
  const READ = seedUuid('paragraph', 'links-read')

  let page: Page

  /** Whether a string carries any of the filter's output. */
  function isProcessed(value: string): boolean {
    return value.includes(HINT) || value.includes(TARGET)
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/links', 'links'),
    )
    // `runAgentTool`/`runComponentTool` only exist once the test-cases pane mounts.
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  // ── Reads: what the model is shown ────────────────────────────────────────
  // All of these resolve through `fieldValue.readValue` /
  // `readBlockContentFields`, so they share one root cause.

  test('readRawValue returns the stored field value', async () => {
    // The provider-level contract underneath every tool below — and the read
    // basis `delegate_text_rewrite` turns into its `baseValue`.
    const values = await page.evaluate((uuid) => {
      const fieldValue = window.__BLOKKLI__!.app!.fieldValue
      const args = ['paragraph', uuid, 'text', 'field_text', 'markup'] as const
      return {
        raw: fieldValue.readRawValue(...args),
        rendered: fieldValue.readValue(...args),
      }
    }, READ)
    expect(values.raw).toBe(RAW)
    // `readValue` is deliberately left alone — the editor's preview machinery
    // restores what was on screen, so it must keep returning the rendered value.
    expect(values.rendered).toContain(HINT)
    expect(values.rendered).toContain(TARGET)
  })

  test('get_all_page_content reports raw markup', async () => {
    const result = await runAgentTool(page, 'get_all_page_content', {})
    const entry = result.content.find((b) => b.uuid === READ)
    expect(entry, 'text should appear in get_all_page_content').toBeDefined()
    expect(entry!.text).toContain('Omega')
    expect(isProcessed(entry!.text)).toBe(false)
  })

  test('get_paragraph_context reports raw markup', async () => {
    const result = await runAgentTool(page, 'get_paragraph_context', {
      uuid: READ,
      includeContentFields: true,
      includeParentChain: false,
      includeSiblings: false,
      includeChildren: false,
      includeOptions: false,
    })
    const json = JSON.stringify(result)
    expect(json).toContain('Omega')
    expect(isProcessed(json)).toBe(false)
  })

  test('get_content_fields reports the stored markup, link and all', async () => {
    const result = await runAgentTool(page, 'get_content_fields', {
      uuids: [READ],
      includeNested: false,
    })
    const field = result[READ]?.field_text
    expect(field, 'field_text should be present').toBeDefined()
    // The link keeps its stored attributes: no target, no hint after it.
    expect((field as { currentValue?: string }).currentValue).toBe(RAW)
  })

  test('get_page_structure reports raw paragraph content', async () => {
    const result = await runAgentTool(page, 'get_page_structure', {
      uuid: READ,
    })
    // The structure is an XML string; field values are XML-escaped, but both
    // markers survive escaping intact.
    expect(result.structure).toContain('Omega')
    expect(isProcessed(result.structure)).toBe(false)
  })

  test('search_text returns stored snippets for field matches', async () => {
    const result = await runAgentTool(page, 'search_text', {
      query: 'Alpha',
      limit: 20,
    })
    const match = result.matches.find((r) => r.uuid === READ)
    expect(match, 'the text should match the query').toBeDefined()
    // The snippet is a real substring of the stored value, so the model can
    // reuse it as a search/replace target.
    expect(match!.source).toBe('field')
    expect(match!.fieldName).toBe('field_text')
    expect(isProcessed(match!.matchedText)).toBe(false)
    expect(RAW).toContain(match!.matchedText.replace(/^\.\.\.|\.\.\.$/g, ''))
  })

  test('find_paragraphs matches containsText against raw text', async () => {
    // The model builds `containsText` from a value some other tool showed it,
    // and those tools report stored values.
    const result = await runAgentTool(page, 'find_paragraphs', {
      containsText: RAW,
      limit: 50,
    })
    expect(result.paragraphs.map((p) => p.uuid)).toContain(READ)
  })

  // ── DOM-derived reads ─────────────────────────────────────────────────────

  test('get_page_text reports the inserted hint as rendered text, and says so', async () => {
    // Deliberately still processed: the hint is genuinely part of the page,
    // and `get_page_text` is the only tool that captures content belonging to
    // no field. The payload has to carry its own provenance, so the model
    // knows it cannot use the text as an edit target — a tool description is
    // read once, far from the point of use.
    const result = await runAgentTool(page, 'get_page_text', {})
    expect(result.source).toBe('rendered')
    expect(result.text).toContain(HINT)
  })

  // ── Writes: what gets persisted ───────────────────────────────────────────

  test('a patch next to the link persists the stored markup', async () => {
    const uuid = seedUuid('paragraph', 'links-patch')

    // `operations` applies search/replace to the field's CURRENT value, so the
    // whole field is rewritten with whatever that read returned — the link
    // too, although the patch doesn't touch it.
    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'field_text', search: 'Gamma', replace: 'Delta' },
      ],
      requireApproval: false,
    })

    await expect
      .poll(() => storedFieldValue(page, uuid, 'field_text'))
      .toBe(RAW.replace('Gamma', 'Delta'))
  })

  test('a partially accepted diff persists a raw hybrid', async () => {
    const uuid = seedUuid('paragraph', 'links-diff')

    // Rejecting one chunk reassembles the field from the REJECTED chunk's
    // "before" value spliced together with the accepted new chunk — and that
    // before value comes from the read basis.
    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid,
          fieldName: 'field_text',
          value: RAW.replace('Omega', 'Sigma').replace('Gamma', 'Delta'),
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
      .poll(() => storedFieldValue(page, uuid, 'field_text'))
      .toBe(RAW.replace('Gamma', 'Delta'))
  })

  test('an agent edit does not compound the processing', async () => {
    const uuid = seedUuid('paragraph', 'links-compound')

    await runComponentTool(page, 'update_text_fields', {
      operations: [
        { uuid, fieldName: 'field_text', search: 'Omega', replace: 'Sigma' },
      ],
      requireApproval: false,
    })

    // The paragraph's props: the text as Drupal rendered it after the edit.
    const renderedText = () =>
      page.evaluate((uuid) => {
        const item = window.__BLOKKLI__!.app!.state.getFieldListItem(uuid)
        return (item?.props as { text?: string })?.text ?? ''
      }, uuid)

    await expect.poll(renderedText).toContain('Sigma')

    // A stored value that already carries the filter output gets processed a
    // second time: `filter_html` keeps the stored hint's text and the filter
    // appends another, and every further agent edit adds one more.
    expect((await renderedText()).split(HINT)).toHaveLength(2)
  })

  // ── Paths that are ALREADY correct ────────────────────────────────────────

  test('get_readability_issues analyses raw values', async () => {
    const result = await runAgentTool(page, 'get_readability_issues', {})
    expect(isProcessed(JSON.stringify(result))).toBe(false)
  })
})
