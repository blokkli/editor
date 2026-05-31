import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp, getHostContext } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { dropAddAction } from './../../support/blocks'
import { topLevelBlockUuids } from './../../support/selection'
import { closeFormOverlay, formOverlay } from './../../support/overlays'
import { emitEvent } from './../../support/events'
import {
  clearAdapterCalls,
  waitForAdapterCall,
  recordedAdapterCalls,
} from './../../support/recorder'

/**
 * The fragments feature (`features/fragments/index.vue`) registers a `fragment`
 * add-action. Dropping it on a field opens `FragmentsDialog`, which lists the
 * fragments allowed on that field; picking one and submitting calls
 * `adapter.fragmentsAddBlock({ name, host, preceedingUuid })`, adding a
 * `blokkli_fragment` block.
 *
 * The drop→open path is covered by `add-list/actions.test.ts`; this spec covers
 * the dialog and the add flow. Selectors are `data-test` only. The mock records
 * `fragmentsAddBlock` under `testing=true`, so we assert the adapter contract
 * (name + host + preceedingUuid) directly, and the block-count delta for the
 * outcome — never on translated copy.
 *
 * Playground facts (`/page/1`): five fragments are defined, but the `content`
 * field allows only `cta`, `shader_debug` and `top_level_link`, so the dialog
 * lists exactly those three.
 */

const ALLOWED = ['cta', 'shader_debug', 'top_level_link']

function fragmentOption(page: Page, name: string): Locator {
  return page.locator(`[data-test-fragment-name="${name}"]`)
}

/** The `name`s of every fragment option rendered in the dialog (any visibility). */
function fragmentOptionNames(page: Page): Promise<string[]> {
  return page
    .locator('[data-test="fragment-option"]')
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-test-fragment-name') ?? ''),
    )
}

function fragmentsSubmit(page: Page): Locator {
  return page.locator('[data-test="fragments-submit"]')
}

/** How many `blokkli_fragment` blocks are currently in the document. */
function fragmentBlockCount(page: Page): Promise<number> {
  return withApp(
    page,
    (app) =>
      app.blocks.getAllBlocks().filter((b) => b.bundle === 'blokkli_fragment')
        .length,
  )
}

/** How many `fragmentsAddBlock` calls the adapter has recorded so far. */
async function fragmentAddCalls(page: Page): Promise<number> {
  const calls = await recordedAdapterCalls(page)
  return calls.filter((c) => c.method === 'fragmentsAddBlock').length
}

type FragmentsAddArgs = {
  name: string
  host: { type: string; uuid: string; fieldName: string }
  preceedingUuid: string | null
}

/** Drop the `fragment` action on the content field and wait for the dialog. */
async function openFragmentsDialog(
  page: Page,
  opts: { preceedingUuid?: string | null } = {},
): Promise<void> {
  await dropAddAction(page, 'fragment', { preceedingUuid: opts.preceedingUuid })
  await formOverlay(page, 'fragments').waitFor({ state: 'visible' })
}

/**
 * Page lifecycle: one editor page shared. Each test opens the fragments
 * dialog freshly via `openFragmentsDialog`. `afterEach` closes the dialog
 * if open (tests 1/3/6 leave it open) and clears the adapter recorder so
 * tests 3 and 4 see `fragmentAddCalls === 0` even after test 2's add.
 * Local `before` snapshots in tests 2/4 keep accumulating fragments
 * harmless.
 */
describe('The fragments feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await formOverlay(page, 'fragments').isVisible()) {
      await closeFormOverlay(page, 'fragments')
    }
    await clearAdapterCalls(page)
  })

  test('the dialog lists only the fragments allowed on the field', async () => {
    await openFragmentsDialog(page)

    const names = await fragmentOptionNames(page)
    expect(names.sort()).toEqual([...ALLOWED].sort())
    // The other defined fragments are not allowed on `content`.
    expect(names).not.toContain('demo_card')
    expect(names).not.toContain('features_list')
  })

  test('selecting a fragment and submitting adds a fragment block', async () => {
    const host = await getHostContext(page)
    const before = await fragmentBlockCount(page)

    await openFragmentsDialog(page)
    await fragmentOption(page, 'cta').click()
    await fragmentsSubmit(page).click()

    // The feature forwards the selected name and the placed host/position to the
    // adapter.
    const args = await waitForAdapterCall<FragmentsAddArgs>(
      page,
      'fragmentsAddBlock',
    )
    expect(args.name).toBe('cta')
    expect(args.host).toEqual({
      type: host.type,
      uuid: host.uuid,
      fieldName: 'content',
    })
    expect(args.preceedingUuid).toBeNull()

    // The dialog closes and a fragment block was actually added.
    await formOverlay(page, 'fragments').waitFor({ state: 'detached' })
    await expect.poll(() => fragmentBlockCount(page)).toBe(before + 1)
  })

  test('submitting without a selection is a no-op', async () => {
    await openFragmentsDialog(page)

    // No fragment picked → the submit guard (`if (selectedItem.value)`) returns
    // early: the dialog stays open and nothing reaches the adapter.
    await fragmentsSubmit(page).click()

    expect(await formOverlay(page, 'fragments').count()).toBe(1)
    expect(await fragmentAddCalls(page)).toBe(0)
  })

  test('closing the dialog adds nothing', async () => {
    const before = await fragmentBlockCount(page)
    await openFragmentsDialog(page)

    // `FormOverlay` closes on the `overlay:close` event.
    await emitEvent(page, 'overlay:close')
    await formOverlay(page, 'fragments').waitFor({ state: 'detached' })

    expect(await fragmentAddCalls(page)).toBe(0)
    expect(await fragmentBlockCount(page)).toBe(before)
  })

  test('the placed position (preceeding block) is forwarded to the adapter', async () => {
    const first = (await topLevelBlockUuids(page))[0]!

    await openFragmentsDialog(page, { preceedingUuid: first })
    await fragmentOption(page, 'top_level_link').click()
    await fragmentsSubmit(page).click()

    const args = await waitForAdapterCall<FragmentsAddArgs>(
      page,
      'fragmentsAddBlock',
    )
    expect(args.name).toBe('top_level_link')
    expect(args.preceedingUuid).toBe(first)
  })

  test('the search field filters the fragment list', async () => {
    await openFragmentsDialog(page)

    // The filter uses `v-show`, so the items stay in the DOM — assert visibility.
    await page.locator('[data-test="fragments-search"]').fill('shader')

    await expect
      .poll(() => fragmentOption(page, 'shader_debug').isVisible())
      .toBe(true)
    await expect.poll(() => fragmentOption(page, 'cta').isVisible()).toBe(false)
    await expect
      .poll(() => fragmentOption(page, 'top_level_link').isVisible())
      .toBe(false)
  })
})
