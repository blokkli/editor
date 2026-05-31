import { describe, expect, test } from 'vitest'
import { openEditor, withApp, getHostContext } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { openAppMenu, appMenuButton } from './../../support/menu'

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

describe('The exit feature', async () => {
  await setupEditorE2E()

  test('the app menu has an exit button', async () => {
    const page = await openEditor()
    await openAppMenu(page)

    expect(await appMenuButton(page, 'exit').count()).toBe(1)

    await page.close()
  })

  test('clicking exit broadcasts closeEditor and leaves the editor', async () => {
    const page = await openEditor()
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

    await page.close()
  })
})
