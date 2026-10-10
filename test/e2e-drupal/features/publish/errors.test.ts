import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { appMenuButton, openAppMenu } from '../../support/menu'
import { dialog, dialogSubmit } from '../../support/overlays'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

/** Drupal's answer to the publish mutation. */
const PUBLISH = /\/mutation\/pbPublish\b/

/**
 * A publish that fails for a reason other than validation says so: with the
 * reason Drupal gives (e.g. that someone else is changing the page), or that
 * something went wrong. Drupal's answer is replaced, so nothing is published;
 * the module's PublishDataProducerTest covers the reasons it gives.
 */
describe('A failed publish', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    // Something to publish.
    await addBlock(page)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await page.unroute(PUBLISH)
    await emitEvent(page, 'overlay:close')
    await dialog(page, 'publish').waitFor({ state: 'detached' })
  })

  async function publish(body: unknown): Promise<void> {
    await page.route(PUBLISH, (route) => route.fulfill({ json: body }))
    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor()
    await dialogSubmit(page).click()
    // The section that lists why publishing failed.
    await page.locator('[data-test="publish-validation-errors"]').waitFor()
  }

  test('shows the reason Drupal gives', async () => {
    const reason = 'PUBLISH_FAILED_REASON'
    await publish({
      data: {
        state: {
          action: { success: false, errors: [reason], violations: [] },
        },
      },
      errors: [],
    })

    expect(
      await page.locator('[data-test="publish-error-item"]').allTextContents(),
    ).toEqual([reason])
    // Not a validation error: no hint to fix the content.
    expect(
      await page.locator('[data-test="publish-violations-info"]').count(),
    ).toBe(0)
  })

  test('says that something went wrong without a reason', async () => {
    await publish({
      data: { state: { action: null } },
      errors: [{ message: 'Internal server error' }],
    })

    expect(await page.locator('[data-test="publish-error-item"]').count()).toBe(
      1,
    )
    expect(
      await page.locator('[data-test="publish-violations-info"]').count(),
    ).toBe(0)
  })
})
