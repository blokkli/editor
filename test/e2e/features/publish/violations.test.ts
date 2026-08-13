import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from './../../support/menu'
import { dialog, dialogSubmit, dismissMessages } from './../../support/overlays'
import { addBlock } from './../../support/blocks'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { setupEditorE2E } from './../../support/setup'
import { openEditor, withApp } from './../../support/session'
import { emitEvent } from './../../support/events'

/**
 * Publish-dialog failure rendering.
 *
 * Validation failures come from the mock's real `validate()` hooks: an empty
 * `grid` paragraph reports two violations (its `header` and `blocks` fields
 * are required); a `not_implemented` block is rejected by the publish
 * handler with a plain error string. Both flows return `success: false` and
 * the dialog renders the response inside the `publish-validation-errors`
 * panel — no generic toast (hidden behind the modal). Clicking a block-bound
 * violation closes the dialog and the canvas's existing `select` +
 * `scrollIntoView` listeners do the rest.
 */
describe('Publish dialog — failure rendering', async () => {
  await setupEditorE2E()

  let page: Page

  async function openPublishDialog(): Promise<void> {
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
  }

  /**
   * The playground persists EditState mutations to localStorage. Clearing
   * those keys + emitting `reloadState` resets the editor to an empty
   * mutation list without a full page reload. See `history/base.test.ts`.
   */
  async function resetEditor(): Promise<void> {
    await page.evaluate(() => {
      localStorage.removeItem('__30_blokkli_mock_1_mutations')
      localStorage.removeItem('__30_blokkli_mock_1_index')
    })
    await emitEvent(page, 'reloadState')
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.mutations.value.length === 0,
    )
  }

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
    await dismissMessages(page)
    await clearAdapterCalls(page)
    await resetEditor()
  })

  test('renders violations from an empty grid and keeps the dialog open', async () => {
    // An empty `grid` paragraph reports two violations (header + blocks).
    await addBlock(page, { bundle: 'grid' })

    await openPublishDialog()
    await dialogSubmit(page).click()
    await waitForAdapterCall(page, 'publish')

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-violation-item"]')
    await expect.poll(() => items.count()).toBe(2)

    // Dialog must NOT close on failure.
    expect(await dialog(page, 'publish').isVisible()).toBe(true)
  })

  test('renders a plain error for a not_implemented block', async () => {
    await addBlock(page, { bundle: 'not_implemented' })

    await openPublishDialog()
    await dialogSubmit(page).click()
    await waitForAdapterCall(page, 'publish')

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-error-item"]')
    await expect.poll(() => items.count()).toBe(1)
    expect(await dialog(page, 'publish').isVisible()).toBe(true)
  })

  test('clicking a block-bound violation closes the dialog and selects the block', async () => {
    const gridUuid = await addBlock(page, { bundle: 'grid' })
    expect(gridUuid).toBeTruthy()

    await openPublishDialog()
    await dialogSubmit(page).click()
    await waitForAdapterCall(page, 'publish')

    // `publish` resolves after a delay — wait for the validation panel to
    // render (as the sibling test does) before counting, otherwise the poll
    // races the async response.
    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-violation-item"]')
    await items.first().waitFor({ state: 'visible' })
    await expect.poll(() => items.count()).toBe(2)
    // Click the violation's button (the full-width `<li>` isn't the click
    // target — only the inner button carries the navigate handler).
    await items
      .first()
      .locator('[data-test="publish-violation-button"]')
      .click()

    await dialog(page, 'publish').waitFor({ state: 'hidden' })

    // Selection now points at the offending grid block.
    expect(await withApp(page, (app) => app.selection.uuids.value)).toContain(
      gridUuid,
    )
  })
})
