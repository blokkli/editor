import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../../../e2e/support/session'
import { selectBlock } from '../../../e2e/support/blocks'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/**
 * The add list (left toolbar) renders one item per available block bundle plus
 * the add actions. An item that can't be placed in the current context is shown
 * in a transparent ("disabled") state — reflected on the DOM via the boolean
 * `data-test-disabled` attribute. The three actions — `template`, `library`
 * (from library) and `fragment` — sit in their own group.
 *
 * On the front page (content/nodes/home.yml): its field allows every action,
 * fragments included, and it has a columns paragraph.
 */

const ACTIONS = ['template', 'library', 'fragment'] as const

const COLUMNS = seedUuid('paragraph', 'home-columns')

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
 * selected. Test 3 selects the columns paragraph; it runs LAST because that
 * selection would defeat the "nothing selected" assertions in test 2.
 */
describe('The add list', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', editorPath('/en', 'home'))
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

  test('selecting columns keeps only their allowed bundles active, and no fragments', async () => {
    await selectBlock(page, COLUMNS)

    // The bundles allowed in any of the columns' nested fields (`field_left`
    // and `field_right`), derived from the live field config. The internal
    // `from_library` bundle is left in: the blocks group filters it out (via
    // `isInternalBundle`), so it never renders as a block item and thus never
    // appears in `states` below.
    const allowedInColumns = await withApp(page, (app) => [
      ...new Set(
        app.types.fieldConfig
          .all()
          .filter((config) => config.entityBundle === 'columns')
          .flatMap((config) => config.allowedBundles),
      ),
    ])

    // The add list updates with the selection.
    await expect
      .poll(async () => (await blockItemStates(page)).section)
      .toBe(true)
    const states = await blockItemStates(page)

    // Every rendered block is transparent exactly when it is not allowed
    // anywhere inside the columns.
    for (const [bundle, disabled] of Object.entries(states)) {
      expect(disabled).toBe(!allowedInColumns.includes(bundle))
    }

    // The active blocks are precisely the allowed bundles that the list
    // renders — and there is at least one, so the assertion above isn't vacuous.
    const activeBundles = Object.entries(states)
      .filter(([, disabled]) => !disabled)
      .map(([bundle]) => bundle)
    expect(activeBundles.sort()).toEqual(
      allowedInColumns.filter((bundle) => bundle in states).sort(),
    )
    expect(activeBundles.length).toBeGreaterThan(0)

    // Templates and the library stay active; fragments aren't allowed in the
    // columns' fields.
    expect(await actionIsDisabled(page, 'template')).toBe(false)
    expect(await actionIsDisabled(page, 'library')).toBe(false)
    expect(await actionIsDisabled(page, 'fragment')).toBe(true)
  })
})
