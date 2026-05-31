import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { addBlocks, selectBlock } from './../../support/blocks'
import { setupEditorE2E } from './../../support/setup'

/**
 * The add list (left toolbar) renders one item per available block bundle plus
 * the add actions. An item that can't be placed in the current context is shown
 * in a transparent ("disabled") state — reflected on the DOM via the boolean
 * `data-test-disabled` attribute (present only when disabled). The three
 * actions — `template`, `library` (from library) and `fragment` — sit in their
 * own group.
 */

const ACTIONS = ['template', 'library', 'fragment'] as const

/**
 * The block items in the add list, mapped to whether each is disabled
 * (transparent), read from `data-test-disabled` within the blocks group.
 */
function blockItemStates(page: Page): Promise<Record<string, boolean>> {
  return page
    .locator('[data-test="add-list-blocks"] [data-test^="add-list-item-"]')
    .evaluateAll((els) =>
      Object.fromEntries(
        els.map((el) => [
          el.getAttribute('data-test')!.replace('add-list-item-', ''),
          el.getAttribute('data-test-disabled') === 'true',
        ]),
      ),
    )
}

/** Whether the given add action is in its disabled (transparent) state. */
async function actionIsDisabled(page: Page, id: string): Promise<boolean> {
  const value = await page
    .locator(`[data-test="add-list-actions"] [data-test="add-list-item-${id}"]`)
    .getAttribute('data-test-disabled')
  return value === 'true'
}

/**
 * Page lifecycle: one editor page is opened in `beforeAll` and shared by all
 * three tests. Tests 1 & 2 are read-only, and run first while nothing is
 * selected. Test 3 adds a grid block and selects it; it runs LAST because
 * that selection would defeat the "nothing selected" assertions in test 2.
 */
describe('The add list', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  test('the add list element is rendered', async () => {
    // `.count()` is asserted (not the locator itself — a locator is always
    // truthy, which is how this spec used to pass against a non-built app).
    expect(await page.locator('[data-test="add-list"]').count()).toBe(1)
  })

  test('with nothing selected every block and action is active', async () => {
    const states = await blockItemStates(page)
    // Sanity: blocks are actually rendered.
    expect(Object.keys(states).length).toBeGreaterThan(0)
    // Nothing is selected, so no block is in the transparent state.
    expect(Object.values(states).every((disabled) => !disabled)).toBe(true)

    // All three actions are active too.
    for (const id of ACTIONS) {
      expect(await actionIsDisabled(page, id)).toBe(false)
    }
  })

  test('selecting a grid keeps only its allowed bundles (and all actions) active', async () => {
    const grid = randomUUID()
    await addBlocks(page, [{ bundle: 'grid', uuid: grid }])
    await selectBlock(page, grid)

    // The bundles allowed in any of the grid's nested fields (`header` and
    // `blocks`), derived from the live field config so the test stays in sync
    // with the mock. The internal from-library/fragment bundles are left in:
    // the blocks group filters them out (via `isInternalBundle`), so they never
    // render as block items and thus never appear in `states` below.
    const allowedInGrid = await withApp(page, (app) => [
      ...new Set(
        app.types.fieldConfig
          .all()
          .filter((config) => config.entityBundle === 'grid')
          .flatMap((config) => config.allowedBundles),
      ),
    ])

    const states = await blockItemStates(page)

    // Every rendered block is transparent exactly when it is not allowed
    // anywhere inside the grid.
    for (const [bundle, disabled] of Object.entries(states)) {
      expect(disabled).toBe(!allowedInGrid.includes(bundle))
    }

    // The active blocks are precisely the grid-allowed bundles that the list
    // renders — and there is at least one, so the assertion above isn't vacuous.
    const activeBundles = Object.entries(states)
      .filter(([, disabled]) => !disabled)
      .map(([bundle]) => bundle)
    expect(activeBundles.sort()).toEqual(
      allowedInGrid.filter((bundle) => bundle in states).sort(),
    )
    expect(activeBundles.length).toBeGreaterThan(0)

    // The three actions stay active regardless of the selection.
    for (const id of ACTIONS) {
      expect(await actionIsDisabled(page, id)).toBe(false)
    }
  })
})
