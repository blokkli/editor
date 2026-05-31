import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { addBlocks, selectBlock } from './../../support/blocks'
import { emitEvent } from './../../support/events'
import { closeFormOverlay, formOverlay } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import {
  bundleSelector,
  bundleSelectorItemIds,
  bundleSelectorSearch,
  pickBundle,
} from './../../support/bundleSelector'

/**
 * The "add buttons" (selection/AddButtons feature) are drawn on the WebGL
 * canvas, so there is no DOM element to click. Instead we drive them with the
 * `selection:add-button:trigger` event, which the feature handles exactly like
 * a canvas click on the corresponding button of the current selection — and,
 * like the canvas buttons, only acts when the button would actually be shown.
 * When the target field allows more than one bundle, this opens the
 * `BundleSelector` overlay (`data-test="bundle-selector"`).
 */

/**
 * Add a grid holding a title (in its single-cardinality `header` field) and
 * three cards (in its `blocks` field). Returns the created uuids.
 */
async function addGrid(page: Page) {
  const grid = randomUUID()
  const title = randomUUID()
  const cards = [randomUUID(), randomUUID(), randomUUID()] as const
  await addBlocks(page, [
    {
      bundle: 'grid',
      uuid: grid,
      children: {
        header: [{ bundle: 'title', uuid: title }],
        blocks: cards.map((uuid) => ({ bundle: 'card', uuid })),
      },
    },
  ])
  return { grid, title, cards }
}

/**
 * Add a grid, select its last card and trigger that card's "after" add button
 * (its `blocks` field allows several bundles → the selector opens). Returns the
 * open `BundleSelector` locator.
 */
async function openCardBundleSelector(page: Page): Promise<Locator> {
  const { cards } = await addGrid(page)
  await selectBlock(page, cards[2])
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
 * Page lifecycle: one editor page shared. Every helper (`addGrid`,
 * `openCardBundleSelector`) uses `randomUUID()` so per-test grids never
 * collide. `afterEach` closes the bundle selector (Escape — the
 * `ArtboardTooltip` reacts), any form overlay opened by tests 9/10
 * (`templates` / `library`), and deselects. Test 1 only asserts the
 * selector opens, but its `bundleSelector.count() === 0` precheck still
 * works on a shared page because `afterEach` always reaches a clean state.
 */
describe('The selection add buttons', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // The selector unmounts via `BlokkliTransition` (`v-if` on `addData`), so
    // after a test that picked a bundle the element can still be in the DOM
    // mid leave-transition. Give the auto-close a short grace period; only
    // click the close button if it really stayed open.
    try {
      await bundleSelector(page).waitFor({ state: 'hidden', timeout: 500 })
    } catch {
      await bundleSelector(page)
        .locator('[data-test="artboard-tooltip-close"]')
        .click()
      await bundleSelector(page).waitFor({ state: 'hidden' })
    }
    for (const id of ['templates', 'library'] as const) {
      if (await formOverlay(page, id).isVisible()) {
        await closeFormOverlay(page, id)
      }
    }
    await emitEvent(page, 'select:unselect')
  })

  test("triggering a card's add button opens the bundle selector", async () => {
    expect(await bundleSelector(page).count()).toBe(0)

    await openCardBundleSelector(page)
    await bundleSelector(page).waitFor({ state: 'visible' })
  })

  test('a title in the grid has no add buttons (its header field holds a single block)', async () => {
    const { title } = await addGrid(page)

    // The grid's `header` field has a cardinality of 1 and already holds the
    // title, so neither the before nor the after add button is shown —
    // triggering them is a no-op and no selector opens.
    await selectBlock(page, title)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'before',
    })
    await emitEvent(page, 'selection:add-button:trigger', { position: 'after' })

    // Give any (erroneous) selector a chance to appear before asserting absence.
    await page.waitForTimeout(300)
    expect(await bundleSelector(page).count()).toBe(0)
  })

  test("the grid's empty header field offers the title/text bundles and the template action", async () => {
    // A grid whose `header` field is left empty (the `blocks` field has a card,
    // so `header` is the grid's only empty field → index 0).
    const grid = randomUUID()
    await addBlocks(page, [
      {
        bundle: 'grid',
        uuid: grid,
        children: { blocks: [{ bundle: 'card', uuid: randomUUID() }] },
      },
    ])

    // Selecting the grid surfaces its empty-field add button; triggering it
    // opens the selector scoped to the `header` field (allows `title`/`text`).
    await selectBlock(page, grid)
    await emitEvent(page, 'selection:add-button:trigger', {
      position: 'field',
      index: 0,
    })

    await bundleSelector(page).waitFor({ state: 'visible' })

    expect((await bundleSelectorItemIds(page, 'blocks')).sort()).toEqual(
      ['text', 'title'].sort(),
    )
    // No fragments (the field allows none) and no "From library" action (the
    // field doesn't allow the from-library bundle) — only "Template".
    expect(await bundleSelectorItemIds(page, 'actions')).toEqual(['template'])
    expect(await bundleSelectorItemIds(page, 'fragments')).toEqual([])
  })

  test('starting a drag closes the bundle selector', async () => {
    const selector = await openCardBundleSelector(page)
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

  test('the bundle selector lists the expected blocks, actions and fragments', async () => {
    await openCardBundleSelector(page)

    // Blocks allowed in the grid's `blocks` field (the internal `from_library`
    // and `blokkli_fragment` bundles surface as an action / fragments instead).
    expect((await bundleSelectorItemIds(page, 'blocks')).sort()).toEqual(
      ['card', 'image', 'teaser', 'text', 'video'].sort(),
    )

    // "Template" (always) and "From library" (because the field allows the
    // from-library bundle).
    expect((await bundleSelectorItemIds(page, 'actions')).sort()).toEqual(
      ['library', 'template'].sort(),
    )

    // The field's single allowed fragment.
    expect(await bundleSelectorItemIds(page, 'fragments')).toEqual([
      'fragment:demo_card',
    ])
  })

  test('searching narrows to matching blocks and fragments and hides the actions group', async () => {
    await openCardBundleSelector(page)

    await bundleSelectorSearch(page).fill('card')

    // Only the "card" bundle and the "demo_card" fragment match; no action
    // matches, so the actions group is hidden entirely.
    await expect
      .poll(() => bundleSelectorItemIds(page, 'blocks'))
      .toEqual(['card'])
    await expect
      .poll(() => bundleSelectorItemIds(page, 'fragments'))
      .toEqual(['fragment:demo_card'])

    expect(await bundleSelectorItemIds(page, 'actions')).toEqual([])
    expect(
      await page.locator('[data-test="bundle-selector-actions"]').isVisible(),
    ).toBe(false)
  })

  test('searching for "card" and pressing enter adds a card', async () => {
    await openCardBundleSelector(page)
    const input = bundleSelectorSearch(page)

    await input.fill('card')
    await expect
      .poll(() => bundleSelectorItemIds(page, 'blocks'))
      .toEqual(['card'])

    const before = await page.evaluate(() =>
      window.__BLOKKLI__!.app!.state.getAllUuids(),
    )
    await input.press('Enter')

    // Submitting picks the first result — the "card" block.
    const added = await newBlock(page, before)
    expect(added?.bundle).toBe('card')
    expect(added?.fragment).toBeNull()
  })

  test('searching for "demo card" and pressing enter adds the demo card fragment', async () => {
    await openCardBundleSelector(page)
    const input = bundleSelectorSearch(page)

    await input.fill('demo card')
    // Wait until fzf has filtered the blocks away, so the first result — and
    // thus what Enter submits — is the fragment, not a block.
    await expect.poll(() => bundleSelectorItemIds(page, 'blocks')).toEqual([])
    await expect
      .poll(() => bundleSelectorItemIds(page, 'fragments'))
      .toEqual(['fragment:demo_card'])

    const before = await page.evaluate(() =>
      window.__BLOKKLI__!.app!.state.getAllUuids(),
    )
    await input.press('Enter')

    const added = await newBlock(page, before)
    expect(added?.fragment).toBe('demo_card')
  })

  test('clicking the "Template" action opens the template form overlay', async () => {
    await openCardBundleSelector(page)

    await pickBundle(page, 'template')

    await page
      .locator('[data-test="form-overlay-templates"]')
      .waitFor({ state: 'visible' })
  })

  test('clicking the "From library" action opens the library form overlay', async () => {
    await openCardBundleSelector(page)

    await pickBundle(page, 'library')

    await page
      .locator('[data-test="form-overlay-library"]')
      .waitFor({ state: 'visible' })
  })
})
