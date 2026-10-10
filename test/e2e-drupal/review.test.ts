import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  BLOCKS_EDITOR_PATH,
  claimEditState,
  openEditor,
  waitForEditorReady,
  withApp,
} from './support/session'
import { openSidebar } from './support/sidebar'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'

/**
 * A reviewer may view edit states but not create them. On a page nobody has
 * edited, Drupal gives them an edit state that isn't stored and has no owner:
 * the page without changes, in review mode. Once someone who may edit opens the
 * page, the reviewer gets the stored edit state.
 *
 * The tests share the page "Blocks", which nobody opens before the first test,
 * and run in order.
 */
describe('Reviewing', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Marc Brunner', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  test('a reviewer reviews and comments on a page nobody has edited', async () => {
    const banners = page.locator(
      '[data-test="view-only-banner"], [data-test="state-unavailable-banner"]',
    )
    await banners.first().waitFor()
    expect(await banners.first().getAttribute('data-test')).toBe(
      'view-only-banner',
    )
    expect(
      await page.locator('[data-test="fatal-error-overlay"]').count(),
    ).toBe(0)
    // The edit state has no owner.
    expect(await withApp(page, (app) => app.state.owner.value?.name)).toBe('')

    const marker = 'REVIEW_MARKER_' + Date.now()
    await openSidebar(page, 'comments')
    await page.locator('[data-test="comments-sidebar-add-button"]').click()
    const form = page.locator('[data-test="comment-input"]')
    await form.locator('[data-test="richtext-editor"]').click()
    await page.keyboard.type(marker)
    await form.locator('[data-test="comment-input-submit"]').click()
    await expect
      .poll(() =>
        withApp(page, async (app) =>
          ((await app.adapter.loadComments!()) as { body: string }[]).map(
            (c) => c.body,
          ),
        ),
      )
      .toContainEqual(expect.stringContaining(marker))
  })

  // Drupal never caches a response with an edit state (`currentUserIsOwner`
  // makes it uncacheable), so this doesn't cover the cache tag that storing the
  // edit state invalidates: the module's LoadEditStateDataProducerTest does.
  test('the reviewer gets the edit state once an editor has opened the page', async () => {
    // Opening the editor stores the edit state; Anna owns it.
    await claimEditState(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)

    await page.reload()
    await waitForEditorReady(page)
    expect(await withApp(page, (app) => app.state.owner.value?.name)).toBe(
      'Anna Keller',
    )
  })

  // Last: it replaces the edit state the page loads.
  test('without an edit state, the editor says so and keeps working', async () => {
    await page.route(/\/pbEditState\b/, (route) =>
      route.fulfill({ json: { data: { state: null }, errors: [] } }),
    )
    await page.reload()
    await waitForEditorReady(page)

    await page.locator('[data-test="state-unavailable-banner"]').waitFor()
    // What the continuous analysis reads, which threw without a state.
    expect(
      await withApp(page, (app) => app.fieldValue.getTextFieldValues()),
    ).toEqual([])
    expect(
      await page.locator('[data-test="fatal-error-overlay"]').count(),
    ).toBe(0)
    await page.unroute(/\/pbEditState\b/)
  })
})
