import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../../../e2e/support/session'
import {
  blockExists,
  blockState,
  selectBlock,
  selectBlocks,
} from '../../../e2e/support/blocks'
import { storedFieldValue } from '../../../e2e/support/editable'
import { clickItemDropdownAction } from '../../../e2e/support/itemActions'
import { emitEvent } from '../../../e2e/support/events'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor, revertAllChanges } from '../../support/session'

// The paragraphs of the page "Conversions" (content/nodes/conversions.yml).
const FIRST_TITLE = seedUuid('paragraph', 'conversions-first-title')
const SECOND_TITLE = seedUuid('paragraph', 'conversions-second-title')
const TEXT = seedUuid('paragraph', 'conversions-text')
const IMAGE = seedUuid('paragraph', 'conversions-image')

/**
 * The ids of the conversion entries the feature currently registers in the
 * item-actions dropdown (`conversion-<targetBundle>`), read off the plugin
 * registry.
 */
function conversionActionIds(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.plugins
      .get('itemDropdownAction')
      .map((action) => action.id)
      .filter((id) => id.startsWith('conversion-')),
  )
}

const bundleOf = (page: Page, uuid: string): Promise<string | null> =>
  blockState(page, uuid).then((state) => state.bundle)

/** The uuids of the blocks that weren't in the document before. */
async function newUuids(page: Page, before: string[]): Promise<string[]> {
  const after = await withApp(page, (app) => app.state.getAllUuids())
  return after.filter((uuid) => !before.includes(uuid))
}

const allUuids = (page: Page): Promise<string[]> =>
  withApp(page, (app) => app.state.getAllUuids())

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The conversions feature (`features/conversions/index.vue`) registers
 * item-actions *dropdown* entries that convert the selected block(s) to a
 * different bundle. It only offers a conversion when **exactly one bundle** is
 * selected and a configured conversion's `targetBundle` is allowed in the
 * current field; clicking an entry calls `adapter.convertBlocks(uuids, target)`
 * (`pbConvertParagraph`, or `pbConvertMultiple` for several).
 *
 * The sandbox has three conversions (blokkli_playground's plugins:
 * `title→text`, `text→title`, `link→text`). Drupal replaces the paragraph with
 * a new one of the target type, with a new uuid, and maps its fields: a
 * title becomes a text with the title as its heading, a text's content is
 * flattened into a title. We drive the real dropdown and assert on the new
 * paragraph (its bundle and stored values) and the mutation's variables,
 * never on translated UI copy.
 *
 * The feature loads the conversion list lazily on the first selection, so the
 * registered entries are polled until they settle.
 */

/**
 * Page lifecycle: one editor page shared by all tests, on the page
 * "Conversions": two titles, a text and an image. `afterEach` deselects and
 * discards the edit state (`revertAllChanges`), so each test starts from the
 * seeded paragraphs.
 */
describe('The conversions feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/conversions', 'conversions'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await revertAllChanges(page)
  })

  test('offers a matching conversion for a single convertible block', async () => {
    await selectBlock(page, FIRST_TITLE)
    // `title` converts only to `text`.
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])
  })

  test('converting a block changes its bundle and maps its fields', async () => {
    await selectBlock(page, FIRST_TITLE)
    const title = await storedFieldValue(page, FIRST_TITLE, 'field_title')
    const before = await allUuids(page)

    const converted = nextMutation(page, 'pbConvertParagraph')
    await clickItemDropdownAction(page, 'conversion-text')

    // The feature forwarded the selection + target to Drupal.
    expect(await converted).toMatchObject({
      uuid: FIRST_TITLE,
      targetBundle: 'text',
    })

    // Drupal replaced the title with a new text.
    await expect.poll(() => newUuids(page, before)).toHaveLength(1)
    const [text] = await newUuids(page, before)
    expect(await bundleOf(page, text!)).toBe('text')
    expect(await blockExists(page, FIRST_TITLE)).toBe(false)

    // The title is mapped into the text's markup, as its heading.
    const markup = (await storedFieldValue(page, text!, 'field_text'))!
    expect(markup).toContain('<h2')
    expect(stripTags(markup)).toContain(title)
  })

  test('converts in the reverse direction, flattening text into a title', async () => {
    await selectBlock(page, TEXT)
    const markup = (await storedFieldValue(page, TEXT, 'field_text'))!
    const before = await allUuids(page)

    const converted = nextMutation(page, 'pbConvertParagraph')
    await clickItemDropdownAction(page, 'conversion-title')
    await converted

    await expect.poll(() => newUuids(page, before)).toHaveLength(1)
    const [title] = await newUuids(page, before)
    expect(await bundleOf(page, title!)).toBe('title')

    // The text's content is flattened into the title's `field_title`.
    const value = await storedFieldValue(page, title!, 'field_title')
    expect(value).toBeTruthy()
    expect(stripTags(markup)).toContain(value)
  })

  test('offers no conversion for a block whose bundle has none', async () => {
    // Select a convertible block first so the lazy conversion list is loaded —
    // otherwise an empty result would be ambiguous (not-yet-loaded vs. none).
    await selectBlock(page, FIRST_TITLE)
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])

    // `image` is no conversion's source bundle.
    await selectBlock(page, IMAGE)
    await expect.poll(() => conversionActionIds(page)).toEqual([])
  })

  test('offers no conversion when blocks of different bundles are selected', async () => {
    await selectBlock(page, FIRST_TITLE)
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])

    // A mixed-bundle selection has no single source bundle, so nothing is offered.
    await selectBlocks(page, [FIRST_TITLE, IMAGE])
    await expect.poll(() => conversionActionIds(page)).toEqual([])
  })

  test('converts every block in a same-bundle multi-selection', async () => {
    const before = await allUuids(page)

    await selectBlocks(page, [FIRST_TITLE, SECOND_TITLE])
    const converted = nextMutation(page, 'pbConvertMultiple')
    await clickItemDropdownAction(page, 'conversion-text')

    // Both uuids went to Drupal in one call.
    const variables = await converted
    expect(variables.targetBundle).toBe('text')
    expect([...variables.uuids].sort()).toEqual(
      [FIRST_TITLE, SECOND_TITLE].sort(),
    )

    await expect.poll(() => newUuids(page, before)).toHaveLength(2)
    const texts = await newUuids(page, before)
    expect(
      await Promise.all(texts.map((uuid) => bundleOf(page, uuid))),
    ).toEqual(['text', 'text'])
  })
})
