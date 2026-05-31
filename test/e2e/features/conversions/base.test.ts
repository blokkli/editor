import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  addBlock,
  blockState,
  selectBlock,
  selectBlocks,
} from './../../support/blocks'
import { clickItemDropdownAction } from './../../support/itemActions'
import { recordedAdapterCalls } from './../../support/recorder'

/**
 * The conversions feature (`features/conversions/index.vue`) registers
 * item-actions *dropdown* entries that convert the selected block(s) to a
 * different bundle. It only offers a conversion when **exactly one bundle** is
 * selected and a configured conversion's `targetBundle` is allowed in the
 * current field; clicking an entry calls `adapter.convertBlocks(uuids, target)`.
 *
 * The playground mock seeds three conversions (`title→text`, `text→title`,
 * `teaser→button`) and converts the block in place — keeping its uuid and
 * mapping fields between bundles (a title's heading + lead become a text block's
 * markup, and vice-versa). We drive the real dropdown and assert on block state
 * (`bundle` + mapped `props`, read via `withApp`) and the recorded
 * `convertBlocks` call, never on translated UI copy. Each test builds its own
 * blocks with `addBlock`, so it doesn't depend on the seeded page contents.
 *
 * The feature loads the conversion list lazily on the first selection, so the
 * registered entries are polled until they settle.
 */

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

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** The args of the most recent recorded `convertBlocks` call. */
async function lastConvertCall(
  page: Page,
): Promise<{ uuids: string[]; targetBundle: string }> {
  const calls = await recordedAdapterCalls<{
    uuids: string[]
    targetBundle: string
  }>(page)
  return calls.filter((call) => call.method === 'convertBlocks').at(-1)!.args
}

describe('The conversions feature', async () => {
  await setupEditorE2E()

  test('offers a matching conversion for a single convertible block', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'title' })

    await selectBlock(page, uuid!)
    // `title` converts only to `text` (the one seeded conversion whose target is
    // allowed in the content field).
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])

    await page.close()
  })

  test('converting a block changes its bundle and maps its fields', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'title' })

    await selectBlock(page, uuid!)
    const before = await blockState(page, uuid!)

    await clickItemDropdownAction(page, 'conversion-text')

    await expect.poll(() => bundleOf(page, uuid!)).toBe('text')

    const after = await blockState(page, uuid!)
    // The title's heading + lead are mapped into the text block's markup.
    expect(after.props!.text).toContain('<h2')
    expect(stripTags(after.props!.text)).toContain(before.props!.title)

    // The feature forwarded the selection + target to the adapter.
    expect(await lastConvertCall(page)).toEqual({
      uuids: [uuid],
      targetBundle: 'text',
    })

    await page.close()
  })

  test('converts in the reverse direction, flattening text into a title', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    const before = await blockState(page, uuid!)

    await clickItemDropdownAction(page, 'conversion-title')

    await expect.poll(() => bundleOf(page, uuid!)).toBe('title')

    const after = await blockState(page, uuid!)
    // The text block's content is flattened into the title's `title` field.
    expect(after.props!.title).toBeTruthy()
    expect(stripTags(before.props!.text)).toContain(after.props!.title)

    await page.close()
  })

  test('offers no conversion for a block whose bundle has none', async () => {
    const page = await openEditor()
    const titleUuid = await addBlock(page, { bundle: 'title' })
    const imageUuid = await addBlock(page, { bundle: 'image' })

    // Select a convertible block first so the lazy conversion list is loaded —
    // otherwise an empty result would be ambiguous (not-yet-loaded vs. none).
    await selectBlock(page, titleUuid!)
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])

    // `image` is no conversion's source bundle.
    await selectBlock(page, imageUuid!)
    await expect.poll(() => conversionActionIds(page)).toEqual([])

    await page.close()
  })

  test('offers no conversion when blocks of different bundles are selected', async () => {
    const page = await openEditor()
    const titleUuid = await addBlock(page, { bundle: 'title' })
    const imageUuid = await addBlock(page, { bundle: 'image' })

    await selectBlock(page, titleUuid!)
    await expect
      .poll(() => conversionActionIds(page))
      .toEqual(['conversion-text'])

    // A mixed-bundle selection has no single source bundle, so nothing is offered.
    await selectBlocks(page, [titleUuid!, imageUuid!])
    await expect.poll(() => conversionActionIds(page)).toEqual([])

    await page.close()
  })

  test('converts every block in a same-bundle multi-selection', async () => {
    const page = await openEditor()
    const first = await addBlock(page, { bundle: 'title' })
    const second = await addBlock(page, { bundle: 'title' })

    await selectBlocks(page, [first!, second!])
    await clickItemDropdownAction(page, 'conversion-text')

    await expect
      .poll(() =>
        Promise.all([bundleOf(page, first!), bundleOf(page, second!)]),
      )
      .toEqual(['text', 'text'])

    // Both uuids went to the adapter in one call.
    const call = await lastConvertCall(page)
    expect(call.targetBundle).toBe('text')
    expect([...call.uuids].sort()).toEqual([first, second].sort())

    await page.close()
  })
})
