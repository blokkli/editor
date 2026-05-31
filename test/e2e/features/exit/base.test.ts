import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp, getHostContext } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from './../../support/menu'

/**
 * The exit feature (`features/exit/index.vue`) adds a single app-menu button that
 * leaves the editor without saving: it broadcasts `closeEditor { uuid }` and then
 * navigates to `route.path` — i.e. the current page minus the `blokkliEditing`
 * query, which tears the editor down.
 *
 * Selectors are `data-test` only. We capture the broadcast by registering a
 * listener that writes the payload to `localStorage`: `broadcast.emit` fires the
 * local listener synchronously inside the click handler, before the navigation
 * that follows, so the write lands and survives the reload (the same reason the
 * adapter-call recorder uses `localStorage`).
 */

/**
 * Page lifecycle: one editor page shared. Test 1 just asserts the menu
 * button exists; test 2 clicks Exit and navigates away from the editor, so
 * it MUST run last — after navigation the editor is gone and any
 * `withApp`-based cleanup would fail. `afterEach` closes the app menu if
 * it's still open (test 1 leaves it open); after test 2 the menu element
 * isn't present anyway, so the visibility check skips cleanup naturally.
 */
describe('The exit feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
  })

  test('the app menu has an exit button', async () => {
    await openAppMenu(page)

    expect(await appMenuButton(page, 'exit').count()).toBe(1)
  })

  test('clicking exit broadcasts closeEditor and leaves the editor', async () => {
    const { uuid } = await getHostContext(page)

    // Record the broadcast payload to localStorage. The local listener fires
    // synchronously during the click handler (before it sets location.href), so
    // the write completes ahead of — and outlives — the navigation.
    await withApp(page, (app) =>
      app.broadcast.on('closeEditor', (payload) =>
        localStorage.setItem('test:closeEditor', JSON.stringify(payload)),
      ),
    )

    await openAppMenu(page)
    await appMenuButton(page, 'exit').click()

    // Exiting navigates to `route.path`, dropping the `blokkliEditing` query and
    // unmounting the editor.
    await page.waitForFunction(
      () => !new URL(window.location.href).searchParams.has('blokkliEditing'),
    )
    expect(new URL(page.url()).pathname).toBe('/page/1')

    // The broadcast carried the host entity's uuid.
    const recorded = await page.evaluate(() =>
      localStorage.getItem('test:closeEditor'),
    )
    expect(recorded).not.toBeNull()
    expect(JSON.parse(recorded!)).toEqual({ uuid })
  })
})
