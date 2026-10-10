import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { blockCount, selectBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { closeFormOverlay, formOverlay } from '../../support/overlays'
import {
  bundleSelector,
  bundleSelectorItemIds,
  bundleSelectorSearch,
  pickBundle,
} from '../../support/bundleSelector'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/**
 * The "add buttons" (selection/AddButtons feature) are drawn on the WebGL
 * canvas, so there is no DOM element to click. Instead we drive them with the
 * `selection:add-button:trigger` event, which the feature handles exactly like
 * a canvas click on the corresponding button of the current selection — and,
 * like the canvas buttons, only acts when the button would actually be shown.
 * When the target field allows more than one bundle, this opens the
 * `BundleSelector` overlay (`data-test="bundle-selector"`).
 *
 * On the front page (content/nodes/home.yml): its paragraphs field is the only
 * one that allows fragments. It holds a text, a call to action with four links
 * (as many as its field allows) and columns with an empty left field.
 */

const HOME_EDITOR_PATH = editorPath('/en', 'home')
const TEXT = seedUuid('paragraph', 'home-text')
const LINK = seedUuid('paragraph', 'home-link')
const COLUMNS = seedUuid('paragraph', 'home-columns')

/**
 * Select the front page's text and trigger its "after" add button (the
 * paragraphs field allows several bundles → the selector opens). Returns the
 * open `BundleSelector` locator.
 */
async function openTextBundleSelector(page: Page): Promise<Locator> {
  await selectBlock(page, TEXT)
  await emitEvent(page, 'selection:add-button:trigger', { position: 'after' })

  const selector = bundleSelector(page)
  await selector.waitFor({ state: 'visible' })
  return selector
}

/**
 * Wait for a block that isn't in `before` to appear and return its identity.
 * `fragment` is the fragment name for fragment blocks, else null.
 */
async function newBlock(
  page: Page,
  before: string[],
): Promise<{ uuid: string; bundle: string; fragment: string | null } | null> {
  const handle = await page.waitForFunction((before) => {
    const app = window.__BLOKKLI__!.app!
    const uuid = app.state.getAllUuids().find((u) => !before.includes(u))
    if (!uuid) {
      return null
    }
    const block = app.blocks.getBlock(uuid)
    if (!block) {
      return null
    }
    return {
      uuid,
      bundle: block.bundle,
      fragment: block.fragment?.name ?? null,
    }
  }, before)
  return handle.jsonValue()
}

/**
 * Page lifecycle: one editor page shared. The paragraphs the tests add land
 * after the text and change nothing the other tests rely on. `afterEach`
 * closes any form overlay opened by the last two tests (`templates` /
 * `library`) and deselects, which closes the bundle selector. Test 1 only
 * asserts the selector opens, but its `bundleSelector.count() === 0` precheck
 * still works on a shared page because `afterEach` always reaches a clean
 * state.
 */
describe('The selection add buttons', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', HOME_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    for (const id of ['templates', 'library'] as const) {
      if (await formOverlay(page, id).isVisible()) {
        await closeFormOverlay(page, id)
      }
    }
    // Deselecting also closes the bundle selector: its close button may be
    // out of reach, as the selector opens at the top of the page when the
    // event triggers it, under the editor's toolbar.
    await emitEvent(page, 'select:unselect')
    await bundleSelector(page).waitFor({ state: 'hidden' })
  })

  test("triggering a paragraph's add button opens the bundle selector", async () => {
    expect(await bundleSelector(page).count()).toBe(0)

    await openTextBundleSelector(page)
    await bundleSelector(page).waitFor({ state: 'visible' })
  })

  test('a link in a full call to action has no add buttons (its field holds four links at most)', async () => {
    const before = await blockCount(page)

    // The call to action's `field_links` already holds four links, so neither
    // the before nor the after add button is shown — triggering them is a
    // no-op.
    await selectBlock(page, LINK)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'before',
    })
    await emitEvent(page, 'selection:add-button:trigger', { position: 'after' })

    // Give any (erroneous) selector or paragraph a chance to appear before
    // asserting absence. The field only allows links, so a button that
    // shouldn't be there would add one right away instead of opening the
    // selector: the count shows that.
    await page.waitForTimeout(300)
    expect(await bundleSelector(page).count()).toBe(0)
    expect(await blockCount(page)).toBe(before)
  })

  test("the columns' empty left field offers its paragraph types and both actions", async () => {
    // Selecting the columns surfaces the add button of their empty field
    // (`field_right` has a text, so `field_left` is the only empty one →
    // index 0); triggering it opens the selector scoped to `field_left`.
    await selectBlock(page, COLUMNS)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      index: 0,
    })

    await bundleSelector(page).waitFor({ state: 'visible' })

    expect((await bundleSelectorItemIds(page, 'blocks')).sort()).toEqual(
      [
        'chart',
        'contact',
        'embed',
        'image',
        'link',
        'link_list',
        'table',
        'teaser',
        'teaser_list',
        'text',
        'title',
        'video',
      ].sort(),
    )
    // "Template" (always) and "From library" (the field allows the
    // from-library bundle); no fragments (only the front page's paragraphs
    // field allows them).
    expect((await bundleSelectorItemIds(page, 'actions')).sort()).toEqual(
      ['library', 'template'].sort(),
    )
    expect(await bundleSelectorItemIds(page, 'fragments')).toEqual([])
  })

  test('starting a drag closes the bundle selector', async () => {
    const selector = await openTextBundleSelector(page)
    await selector.waitFor({ state: 'visible' })

    await emitEvent(page, 'dragging:start', {
      items: [],
      coords: { x: 0, y: 0 },
      mode: 'mouse',
    })

    await selector.waitFor({ state: 'hidden' })

    // End the drag so afterEach starts from a clean state.
    await emitEvent(page, 'dragging:end')
  })

  test('the bundle selector lists the expected paragraph types, actions and fragments', async () => {
    await openTextBundleSelector(page)

    // The paragraph types the front page's paragraphs field allows (the
    // internal `from_library` and `blokkli_fragment` bundles surface as an
    // action / fragments instead).
    expect((await bundleSelectorItemIds(page, 'blocks')).sort()).toEqual(
      [
        'accordion',
        'call_to_action',
        'chart',
        'columns',
        'contact',
        'embed',
        'gallery',
        'image',
        'link',
        'link_list',
        'section',
        'steps',
        'table',
        'teaser',
        'teaser_list',
        'text',
        'title',
        'video',
      ].sort(),
    )

    // "Template" (always) and "From library" (because the field allows the
    // from-library bundle).
    expect((await bundleSelectorItemIds(page, 'actions')).sort()).toEqual(
      ['library', 'template'].sort(),
    )

    // The two fragments the front page allows.
    expect((await bundleSelectorItemIds(page, 'fragments')).sort()).toEqual(
      ['fragment:quick_links', 'fragment:today'].sort(),
    )
  })

  test('searching narrows to matching paragraph types and fragments and hides the actions group', async () => {
    await openTextBundleSelector(page)

    await bundleSelectorSearch(page).fill('links')

    // Paragraph types match fuzzily, on their label and description: "Link
    // list", and "Call to action" ("… up to four links."). Fragments match on
    // a substring: "Frequently searched" ("… frequently searched links.").
    // No action matches, so the actions group is hidden entirely.
    await expect
      .poll(async () => (await bundleSelectorItemIds(page, 'blocks')).sort())
      .toEqual(['call_to_action', 'link_list'])
    await expect
      .poll(() => bundleSelectorItemIds(page, 'fragments'))
      .toEqual(['fragment:quick_links'])

    expect(await bundleSelectorItemIds(page, 'actions')).toEqual([])
    expect(
      await page.locator('[data-test="bundle-selector-actions"]').isVisible(),
    ).toBe(false)
  })

  test('searching for "columns" and pressing enter adds columns', async () => {
    await openTextBundleSelector(page)
    const input = bundleSelectorSearch(page)

    await input.fill('columns')
    await expect
      .poll(() => bundleSelectorItemIds(page, 'blocks'))
      .toEqual(['columns'])

    const before = await page.evaluate(() =>
      window.__BLOKKLI__!.app!.state.getAllUuids(),
    )
    await input.press('Enter')

    // Submitting picks the first result — the "columns" paragraph type. They
    // have no form to open first, so they're added right away.
    const added = await newBlock(page, before)
    expect(added?.bundle).toBe('columns')
    expect(added?.fragment).toBeNull()
  })

  test('searching for "today" and pressing enter adds the today fragment', async () => {
    await openTextBundleSelector(page)
    const input = bundleSelectorSearch(page)

    await input.fill('today')
    // Wait until fzf has filtered the paragraph types away, so the first
    // result — and thus what Enter submits — is the fragment.
    await expect.poll(() => bundleSelectorItemIds(page, 'blocks')).toEqual([])
    await expect
      .poll(() => bundleSelectorItemIds(page, 'fragments'))
      .toEqual(['fragment:today'])

    const before = await page.evaluate(() =>
      window.__BLOKKLI__!.app!.state.getAllUuids(),
    )
    await input.press('Enter')

    const added = await newBlock(page, before)
    expect(added?.fragment).toBe('today')
  })

  test('clicking the "Template" action opens the template form overlay', async () => {
    await openTextBundleSelector(page)

    await pickBundle(page, 'template')

    await page
      .locator('[data-test="form-overlay-templates"]')
      .waitFor({ state: 'visible' })
  })

  test('clicking the "From library" action opens the library form overlay', async () => {
    await openTextBundleSelector(page)

    await pickBundle(page, 'library')

    await page
      .locator('[data-test="form-overlay-library"]')
      .waitFor({ state: 'visible' })
  })
})
