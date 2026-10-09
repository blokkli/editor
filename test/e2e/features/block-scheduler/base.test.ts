import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from '../../support/session'
import { setupEditorE2E } from '../../support/setup'
import { addBlock, selectBlock } from '../../support/blocks'
import { itemAction } from '../../support/itemActions'
import { dialog } from '../../support/overlays'
import { emitEvent } from '../../support/events'

/**
 * The block-scheduler feature: a block-actions item action (id `block-scheduler`)
 * that opens a dialog with a publish and an unpublish section. Each section is
 * available only for bundles that support it (`hasPublishOn` / `hasUnpublishOn`):
 * `title` → unpublish only (`playground/app/mock/allTypes.ts`).
 *
 * The other cases run against Drupal (`test/e2e-drupal/features/block-scheduler`);
 * this one follows once the sandbox has a paragraph type that can only be
 * unpublished.
 */
describe('The block scheduler', async () => {
  await setupEditorE2E()

  let page: Page

  const schedulerSection = (type: 'publish' | 'unpublish'): Locator =>
    page.locator(`[data-test="scheduler-${type}"]`)

  beforeAll(async () => {
    page = await openEditor('/page/1?blokkliEditing=1')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // Close the scheduler dialog when open — its `<Dialog>` listens for
    // `overlay:close` on the eventbus and emits `cancel`.
    if (await dialog(page, 'block-scheduler').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'block-scheduler').waitFor({ state: 'hidden' })
    }
  })

  test('offers only the unpublish section for a "title" block', async () => {
    const uuid = await addBlock(page, { bundle: 'title' })
    expect(uuid).toBeTruthy()
    await selectBlock(page, uuid!)
    await itemAction(page, 'block-scheduler').click()
    await dialog(page, 'block-scheduler').waitFor({ state: 'visible' })

    // Publish is unavailable (toggle disabled), unpublish is available.
    expect(
      await schedulerSection('publish').getAttribute('data-test-disabled'),
    ).toBe('true')
    expect(
      await page
        .locator(
          '[data-test="scheduler-publish-toggle"] [data-test="form-toggle-input"]',
        )
        .isDisabled(),
    ).toBe(true)
    expect(
      await schedulerSection('unpublish').getAttribute('data-test-disabled'),
    ).toBe('false')
  })
})
