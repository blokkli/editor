import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { withApp, editorPath, openEditor } from '../../support/session'
import { blockRendered, dropAddAction } from '../../support/blocks'
import { closeFormOverlay, formOverlay } from '../../support/overlays'
import { emitEvent } from '../../support/events'
import { countMutations, nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/**
 * The fragments feature (`features/fragments/index.vue`) registers a `fragment`
 * add-action. Dropping it on a field opens `FragmentsDialog`, which lists the
 * fragments allowed on that field; picking one and submitting calls
 * `adapter.fragmentsAddBlock({ name, host, preceedingUuid })`, adding a
 * `blokkli_fragment` paragraph (`pbAddFragmentParagraph`).
 *
 * The drop→open path is covered by `add-list/actions.test.ts`; this spec covers
 * the dialog and the add flow. Selectors are `data-test` only. We assert the
 * mutation's variables (name + host + position) and the block-count delta for
 * the outcome — never on translated copy.
 *
 * On the front page (content/nodes/home.yml): the sandbox defines three
 * fragments, but its field allows only `today` and `quick_links`, so the dialog
 * lists exactly those two.
 */

const ALLOWED = ['quick_links', 'today']

const HOME = seedUuid('node', 'home')

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

/** The `blokkli_fragment` blocks currently in the document. */
function fragmentBlocks(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.blocks
      .getAllBlocks()
      .filter((b) => b.bundle === 'blokkli_fragment')
      .map((b) => b.uuid),
  )
}

/** Drop the `fragment` action on the paragraphs field and wait for the dialog. */
async function openFragmentsDialog(
  page: Page,
  opts: { preceedingUuid?: string | null } = {},
): Promise<void> {
  await dropAddAction(page, 'fragment', {
    fieldName: 'field_paragraphs',
    preceedingUuid: opts.preceedingUuid,
  })
  await formOverlay(page, 'fragments').waitFor({ state: 'visible' })
}

/**
 * Page lifecycle: one editor page shared. Each test opens the fragments
 * dialog freshly via `openFragmentsDialog`. `afterEach` closes the dialog
 * if open (tests 1/3/6 leave it open). Every request of
 * `pbAddFragmentParagraph` is counted, so tests 3 and 4 can tell that nothing
 * was sent. Local `before` snapshots in tests 2/4 keep accumulating fragments
 * harmless.
 */
describe('The fragments feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let fragmentAdds: () => number

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', editorPath('/en', 'home'))
    fragmentAdds = countMutations(page, 'pbAddFragmentParagraph')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await formOverlay(page, 'fragments').isVisible()) {
      await closeFormOverlay(page, 'fragments')
    }
  })

  test('the dialog lists only the fragments allowed on the field', async () => {
    await openFragmentsDialog(page)

    const names = await fragmentOptionNames(page)
    expect(names.sort()).toEqual([...ALLOWED].sort())
    // The other defined fragment is not allowed on the front page.
    expect(names).not.toContain('office_pages')
  })

  test('selecting a fragment and submitting adds a fragment block', async () => {
    const before = await fragmentBlocks(page)

    await openFragmentsDialog(page)
    await fragmentOption(page, 'today').click()
    const added = nextMutation(page, 'pbAddFragmentParagraph')
    await fragmentsSubmit(page).click()

    // The feature forwards the selected name and the placed host/position to
    // Drupal.
    expect(await added).toMatchObject({
      name: 'today',
      hostType: 'node',
      hostUuid: HOME,
      hostFieldName: 'field_paragraphs',
      afterUuid: null,
    })

    // The dialog closes and a fragment block was actually added, and renders.
    await formOverlay(page, 'fragments').waitFor({ state: 'detached' })
    await expect
      .poll(async () => (await fragmentBlocks(page)).length)
      .toBe(before.length + 1)
    const uuid = (await fragmentBlocks(page)).find((u) => !before.includes(u))!
    await expect.poll(() => blockRendered(page, uuid)).toBe(true)
  })

  test('submitting without a selection is a no-op', async () => {
    const adds = fragmentAdds()
    await openFragmentsDialog(page)

    // No fragment picked → the submit guard (`if (selectedItem.value)`) returns
    // early: the dialog stays open and nothing reaches Drupal.
    await fragmentsSubmit(page).click()

    expect(await formOverlay(page, 'fragments').count()).toBe(1)
    expect(fragmentAdds()).toBe(adds)
  })

  test('closing the dialog adds nothing', async () => {
    const adds = fragmentAdds()
    const before = await fragmentBlocks(page)
    await openFragmentsDialog(page)

    // `FormOverlay` closes on the `overlay:close` event.
    await emitEvent(page, 'overlay:close')
    await formOverlay(page, 'fragments').waitFor({ state: 'detached' })

    expect(fragmentAdds()).toBe(adds)
    expect(await fragmentBlocks(page)).toEqual(before)
  })

  test('the placed position (preceeding block) is forwarded to Drupal', async () => {
    const first = seedUuid('paragraph', 'home-text')

    await openFragmentsDialog(page, { preceedingUuid: first })
    await fragmentOption(page, 'quick_links').click()
    const added = nextMutation(page, 'pbAddFragmentParagraph')
    await fragmentsSubmit(page).click()

    expect(await added).toMatchObject({
      name: 'quick_links',
      afterUuid: first,
    })
  })

  test('the search field filters the fragment list', async () => {
    await openFragmentsDialog(page)

    // The filter uses `v-show`, so the items stay in the DOM — assert
    // visibility. It searches each option's text: only quick_links' label,
    // "Frequently searched", matches.
    await page.locator('[data-test="fragments-search"]').fill('frequently')

    await expect
      .poll(() => fragmentOption(page, 'quick_links').isVisible())
      .toBe(true)
    await expect
      .poll(() => fragmentOption(page, 'today').isVisible())
      .toBe(false)
  })
})
