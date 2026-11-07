import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import type {
  Coord,
  Rectangle,
} from '../../../../src/runtime/editor/types/geometry'
import { KNOB_SIZE } from '../../../../src/runtime/editor/features/selection/AddButtons/geometry'
import { blockCount, fieldUuids, selectBlock } from '../../support/blocks'
import { editableOverlay, saveByClickAway } from '../../support/editable'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
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
import { editorPath, openEditor, withApp } from '../../support/session'

/**
 * The "add buttons" (selection/AddButtons feature) are drawn on the WebGL
 * canvas: tabs before and after the selected block, and a button at the end of
 * each of its fields that can take another block (an empty field's always, a
 * filled field's while the pointer is over it). Most tests drive them with the
 * `selection:add-button:trigger` event, which the feature handles exactly like
 * a canvas click on that button of the current selection — and, like the
 * canvas, only acts when the button would actually be shown. The tests of the
 * buttons themselves use the real pointer. When the target field allows more
 * than one bundle, a button opens the `BundleSelector` overlay
 * (`data-test="bundle-selector"`).
 *
 * On the front page (content/nodes/home.yml): its paragraphs field is the only
 * one that allows fragments. It holds a text, a call to action with four links
 * (as many as its field allows) and columns with an empty left field.
 */

const HOME_EDITOR_PATH = editorPath('/en', 'home')
const TEXT = seedUuid('paragraph', 'home-text')
const CALL_TO_ACTION = seedUuid('paragraph', 'home-call-to-action')
const LINK = seedUuid('paragraph', 'home-link')
const COLUMNS = seedUuid('paragraph', 'home-columns')

/** A field of the columns in viewport coordinates, as the canvas hit-tests it. */
function columnsFieldRect(
  page: Page,
  fieldName: string,
): Promise<Rectangle | null> {
  return page.evaluate((key) => {
    const app = window.__BLOKKLI__!.app!
    app.dom.refreshFieldRect(key)
    const rect = app.dom.getFieldRect(key)
    return rect ? app.ui.getViewportRelativeRect(rect) : null
  }, `${COLUMNS}:${fieldName}`)
}

/** The tooltip of the add button under the pointer, by its target. */
function addButtonTooltip(page: Page, targetId: string): Locator {
  return page.locator(
    `[data-test="add-buttons-tooltip"][data-test-target="${targetId}"]`,
  )
}

/**
 * Move the pointer onto the add button of a field of the columns until it shows
 * its tooltip, and return where that is: the canvas draws it in a later frame,
 * and the editor may still be scrolling the columns into view.
 */
async function pointAtFieldButton(
  page: Page,
  fieldName: string,
  position: (rect: Rectangle) => Coord,
): Promise<Coord> {
  let point: Coord = { x: 0, y: 0 }
  await expect
    .poll(async () => {
      const rect = await columnsFieldRect(page, fieldName)
      if (!rect) {
        return false
      }
      point = position(rect)
      await page.mouse.move(point.x, point.y)
      return addButtonTooltip(page, `field:${fieldName}`).isVisible()
    })
    .toBe(true)
  return point
}

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
    // An added title opens its editable; unchanged, it saves nothing.
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
    // Deselecting also closes the bundle selector: its close button may be
    // out of reach, as the selector opens at the top of the page when the
    // event triggers it, under the editor's toolbar.
    await emitEvent(page, 'select:unselect')
    await emitEvent(page, 'select:host:unselect')
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

  test('a full field has no add button', async () => {
    const before = await blockCount(page)

    // The call to action's `field_links` holds four links, as many as it
    // allows: there's no button at its end.
    await selectBlock(page, CALL_TO_ACTION)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      fieldName: 'field_links',
    })

    // The field only allows links: a button that shouldn't be there would add
    // one right away.
    await page.waitForTimeout(300)
    expect(await bundleSelector(page).count()).toBe(0)
    expect(await blockCount(page)).toBe(before)
  })

  test("the columns' empty left field offers its paragraph types and both actions", async () => {
    // Selecting the columns surfaces the add button of each of their fields;
    // triggering the one of `field_left` opens the selector scoped to it.
    await selectBlock(page, COLUMNS)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      fieldName: 'field_left',
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

  test('the button of a filled field adds at its end', async () => {
    await selectBlock(page, COLUMNS)
    const last = (await fieldUuids(page, 'field_right', COLUMNS)).at(-1)
    expect(last).toBeDefined()

    const added = nextMutation(page, 'pbAddParagraph')
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      fieldName: 'field_right',
    })
    await bundleSelector(page).waitFor({ state: 'visible' })
    await pickBundle(page, 'title')

    expect(await added).toMatchObject({
      type: 'title',
      hostUuid: COLUMNS,
      hostFieldName: 'field_right',
      afterUuid: last,
    })
  })

  test("an empty field gets room in the editor, and keeps the site's larger minimum height", async () => {
    const sizes = await page.evaluate((uuid) => {
      const element = window.__BLOKKLI__!.app!.fields.find(
        uuid,
        'field_left',
      )!.element
      return {
        height: element.offsetHeight,
        minHeight: Number.parseFloat(getComputedStyle(element).minHeight),
        room: getComputedStyle(element, '::before').height,
      }
    }, COLUMNS)

    // The editor's room for an empty field, whatever the site's styles.
    expect(sizes.room).toBe('48px')
    // The columns give their fields more while editing (`min-h-16`): it still
    // applies, the editor's CSS doesn't override it.
    expect(sizes.minHeight).toBeGreaterThan(48)
    expect(sizes.height).toBeGreaterThanOrEqual(sizes.minHeight)
  })

  test('clicking the button of an empty field opens its selector', async () => {
    await selectBlock(page, COLUMNS)
    await emitEvent(page, 'scrollIntoView', { uuid: COLUMNS, immediate: true })

    // The button of an empty field is in its middle.
    const point = await pointAtFieldButton(page, 'field_left', (rect) => ({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    }))
    await page.mouse.click(point.x, point.y)

    await bundleSelector(page).waitFor({ state: 'visible' })
    // The selector of `field_left` (no fragments), and the click selected
    // nothing else.
    expect(await bundleSelectorItemIds(page, 'fragments')).toEqual([])
    expect(
      await withApp(page, (app) => [...app.selection.uuids.value]),
    ).toEqual([COLUMNS])
  })

  test('pointing at a filled field shows the button at its end, which opens its selector', async () => {
    await selectBlock(page, COLUMNS)
    await emitEvent(page, 'scrollIntoView', { uuid: COLUMNS, immediate: true })

    // Only shown while the pointer is over the field: inside it, against its
    // bottom edge, after its last block.
    const point = await pointAtFieldButton(page, 'field_right', (rect) => ({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height - KNOB_SIZE / 2,
    }))
    await page.mouse.click(point.x, point.y)

    await bundleSelector(page).waitFor({ state: 'visible' })
    expect(
      await withApp(page, (app) => [...app.selection.uuids.value]),
    ).toEqual([COLUMNS])
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

  // Adds a block at the end of the page, after which the other tests' blocks
  // would no longer be the last ones: runs last.
  test('with the page selected, the button of its field adds at the end of the page', async () => {
    const last = (await fieldUuids(page)).at(-1)
    expect(last).toBeDefined()

    await emitEvent(page, 'select:host')
    const added = nextMutation(page, 'pbAddParagraph')
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      fieldName: 'field_paragraphs',
    })
    await bundleSelector(page).waitFor({ state: 'visible' })
    // The page's field is the one that allows fragments.
    expect(
      (await bundleSelectorItemIds(page, 'fragments')).length,
    ).toBeGreaterThan(0)
    await pickBundle(page, 'title')

    expect(await added).toMatchObject({
      type: 'title',
      hostType: 'node',
      hostFieldName: 'field_paragraphs',
      afterUuid: last,
    })
  })
})
