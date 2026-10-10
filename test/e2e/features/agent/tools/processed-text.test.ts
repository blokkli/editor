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
 *
 * The cases on markup run against Drupal, whose external-link filter processes
 * the texts (`test/e2e-drupal/features/agent/tools/processed-text`). The plain
 * strings stay here: Drupal never processes those.
 */
describe('agent: text field values are always unprocessed', async () => {
  await setupEditorE2E()

  /** Raw markup fixture. Processing would add `data-bk-processed` to the `<p>`. */
  const RAW_MARKUP = '<p>Alpha and Omega</p><p>Beta and Gamma</p>'
  /** Raw plain-text fixture. Processing would turn `--` into an em dash. */
  const RAW_PLAIN = 'Alpha -- Beta'

  const PLAIN_MARKER = '—'

  let page: Page
  let pageUuid: string
  /** `text` block seeded with RAW_MARKUP. */
  let markupUuid: string
  /** `card` block seeded with RAW_PLAIN in `title`. */
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

  beforeAll(async () => {
    page = await openEditor()
    // `runAgentTool`/`runComponentTool` only exist once the test-cases pane mounts.
    await openSidebar(page, 'test-cases')
    pageUuid = (await getHostContext(page)).uuid

    const text = await addBlock(page, { bundle: 'text', fieldName: 'content' })
    if (!text) throw new Error('Failed to add text block')
    markupUuid = text
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
  // markup).

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

  // ── Writes: what gets persisted ───────────────────────────────────────────

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

  // ── Paths that are ALREADY correct ────────────────────────────────────────
  // Plain `test` on purpose: these read the adapter's raw `textFieldValues`
  // rather than the rendered value, and must keep doing so.

  test('getTextFieldValues exposes raw values', async () => {
    expect(await storedFieldValue(page, markupUuid, 'text')).toBe(RAW_MARKUP)
    expect(await storedFieldValue(page, plainUuid, 'title')).toBe(RAW_PLAIN)
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
