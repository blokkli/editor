import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from '../../support/menu'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { addBlock } from '../../support/blocks'
import {
  withApp,
  editorPath,
  openEditor,
  revertAllChanges,
} from '../../support/session'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import {
  CANARY_WORD,
  canaryPayload,
  installCanary,
  settledCanaries,
} from '../../support/xss'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/** The gallery of the page "Faulty", which holds a title and a text. */
const GALLERY = seedUuid('paragraph', 'faulty-gallery')

/**
 * Publish-dialog failure rendering.
 *
 * Drupal validates the edit state before it publishes. The page "Faulty"
 * (content/nodes/faulty.yml) has a gallery with a title and a text, which a
 * gallery doesn't allow: two violations. Drupal has no content that fails
 * with a plain error, so that test fakes the `pbPublish` response. So does the
 * one with a message whose values aren't escaped: Drupal escapes them. All
 * flows return `success: false` and the dialog renders the response inside the
 * `publish-validation-errors` panel — no generic toast (hidden behind the
 * modal). Clicking a block-bound violation closes the dialog and the canvas's
 * existing `select` + `scrollIntoView` listeners do the rest.
 */
describe('Publish dialog — failure rendering', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /**
   * Adds a text to give the editor a pending mutation (Publish is disabled
   * without one), then opens the publish dialog.
   */
  async function openPublishDialog(): Promise<void> {
    await addBlock(page, { fieldName: 'field_paragraphs' })
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
  }

  /** Submits the dialog and waits for Drupal's answer. */
  async function submit(): Promise<void> {
    const published = nextMutation(page, 'pbPublish')
    await dialogSubmit(page).click()
    await published
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/faulty', 'faulty'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await page.unrouteAll()
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
    await dismissMessages(page)
    await revertAllChanges(page)
  })

  test('renders the violations and keeps the dialog open', async () => {
    await openPublishDialog()
    await submit()

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-violation-item"]')
    await expect.poll(() => items.count()).toBe(2)

    // Dialog must NOT close on failure.
    expect(await dialog(page, 'publish').isVisible()).toBe(true)
  })

  test('renders a plain error', async () => {
    await page.route(
      (url) => url.pathname === '/api/graphql_middleware/mutation/pbPublish',
      (route) =>
        route.fulfill({
          json: {
            data: {
              state: {
                action: {
                  success: false,
                  errors: ['The page could not be published.'],
                  state: null,
                  violations: [],
                },
              },
            },
          },
        }),
    )

    await openPublishDialog()
    await submit()

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-error-item"]')
    await expect.poll(() => items.count()).toBe(1)
    expect(await dialog(page, 'publish').isVisible()).toBe(true)
  })

  test("renders a message's markup sanitised", async () => {
    await installCanary(page)
    // Drupal's placeholder, and a value as another adapter might put it in.
    const message = `${CANARY_WORD} <em class="placeholder">A title</em> ${canaryPayload('violation')}`
    await page.route(
      (url) => url.pathname === '/api/graphql_middleware/mutation/pbPublish',
      (route) =>
        route.fulfill({
          json: {
            data: {
              state: {
                action: {
                  success: false,
                  errors: [],
                  state: null,
                  violations: [
                    {
                      message,
                      code: null,
                      propertyPath: null,
                      entityUuid: null,
                      entityType: null,
                    },
                  ],
                },
              },
            },
          },
        }),
    )

    await openPublishDialog()
    await submit()

    const shown = page.locator('[data-test="publish-violation-message"]')
    await expect
      .poll(async () => (await shown.textContent()) ?? '')
      .toContain(CANARY_WORD)
    expect(
      await shown.evaluate((el) => el.querySelector('em')?.textContent),
    ).toBe('A title')
    // Unsanitised, the page's policy blocks the payload: ../../setup.ts fails
    // the test on the violation.
    expect(await settledCanaries(page)).not.toContain('violation')
  })

  test('clicking a block-bound violation closes the dialog and selects the block', async () => {
    await openPublishDialog()
    await submit()

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })

    const items = errorsPanel.locator('[data-test="publish-violation-item"]')
    await expect.poll(() => items.count()).toBe(2)
    // Click the violation's button (the full-width `<li>` isn't the click
    // target — only the inner button carries the navigate handler).
    await items
      .first()
      .locator('[data-test="publish-violation-button"]')
      .click()

    await dialog(page, 'publish').waitFor({ state: 'hidden' })

    // Selection now points at the gallery that holds the content.
    expect(await withApp(page, (app) => app.selection.uuids.value)).toContain(
      GALLERY,
    )
  })
})
