import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  BLOCKS_EDITOR_PATH,
  editorPath,
  openEditor,
} from '../../support/session'

// The templates (content/templates.yml): columns with two texts, columns with a
// chart, and two texts with translations.
const COLUMNS_TEMPLATE = seedUuid(
  'blokkli_paragraph_template',
  'two-texts-left',
)
const CHART_TEMPLATE = seedUuid('blokkli_paragraph_template', 'chart-left')
const TEXTS_TEMPLATE = seedUuid(
  'blokkli_paragraph_template',
  'translated-texts',
)

// The page "Nested" (content/nodes/nested.yml) and its columns, whose fields
// allow no columns.
const NESTED = seedUuid('node', 'nested')
const COLUMNS = seedUuid('paragraph', 'columns')

// The page "Blocks", which Jonas edits.
const BLOCKS = seedUuid('node', 'blocks')

/**
 * The templates that the dialog "Template" lists for a field: it searches with
 * the field's host, as here.
 */
function searchForField(
  page: Page,
  uuid: string,
  fieldName: string,
): Promise<string[]> {
  return page.evaluate(
    async ({ uuid, fieldName }) => {
      const app = window.__BLOKKLI__!.app!
      const field = app.fields.find(uuid, fieldName)!
      const results = await app.adapter.templatesSearch!({
        host: {
          type: field.hostEntityType,
          uuid: field.hostEntityUuid,
          bundle: field.hostEntityBundle,
          fieldName: field.name,
        },
        page: 0,
        filters: {},
        includeItems: false,
      })
      return results.items.map((v) => v.uuid).sort()
    },
    { uuid, fieldName },
  )
}

/**
 * The search for templates in the dialog "Template".
 *
 * Page lifecycle: Anna opens the page "Nested" in the editor, Jonas, who may
 * not create charts, the page "Blocks". Test 2 adds columns, which nothing
 * else looks at.
 */
describe('Searching templates', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let jonas: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, jonas] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en/nested', 'nested')),
      openEditor(sandbox, 'Jonas Weber', BLOCKS_EDITOR_PATH),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), jonas.close()])
  })

  test('A field gets the templates whose paragraphs it allows', async () => {
    expect(await searchForField(page, NESTED, 'field_paragraphs')).toEqual(
      [COLUMNS_TEMPLATE, CHART_TEMPLATE, TEXTS_TEMPLATE].sort(),
    )
    expect(await searchForField(page, COLUMNS, 'field_left')).toEqual([
      TEXTS_TEMPLATE,
    ])
  })

  test('So does a field of a paragraph that is not published yet', async () => {
    const uuid = await addBlock(page, { bundle: 'columns' })
    await expect
      .poll(() =>
        page.evaluate(
          (uuid) => !!window.__BLOKKLI__!.app!.fields.find(uuid, 'field_left'),
          uuid!,
        ),
      )
      .toBe(true)
    expect(await searchForField(page, uuid!, 'field_left')).toEqual([
      TEXTS_TEMPLATE,
    ])
  })

  test('Only who may create all its paragraph types finds a template', async () => {
    // Its chart is nested in columns, which Jonas may create.
    expect(await searchForField(jonas, BLOCKS, 'field_paragraphs')).toEqual(
      [COLUMNS_TEMPLATE, TEXTS_TEMPLATE].sort(),
    )
  })

  test("A template's paragraph types come once per paragraph", async () => {
    const bundles = await page.evaluate(async (uuid) => {
      const { adapter } = window.__BLOKKLI__!.app!
      const results = await adapter.templatesSearch!({
        page: 0,
        filters: {},
        includeItems: false,
      })
      return results.items.find((v) => v.uuid === uuid)?.itemBundles
    }, TEXTS_TEMPLATE)
    // Not once per translation of a paragraph.
    expect(bundles).toEqual(['text', 'text'])
  })
})
