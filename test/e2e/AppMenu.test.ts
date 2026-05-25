import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './support/session'
import { openAppMenu, appMenuButton } from './support/menu'
import { dragNewBlockIntoPage } from './support/blocks'
import { setupEditorE2E } from './support/setup'

/**
 * Assert an app-menu button's enabled/disabled state. `toBeDisabled` /
 * `toBeEnabled` are `@playwright/test` matchers and not available under
 * Vitest's `expect`, so read the native disabled state off the Locator instead.
 */
async function expectMenuButton(
  page: Page,
  id: string,
  disabled: boolean,
): Promise<void> {
  expect(await appMenuButton(page, id).isDisabled()).toBe(disabled)
}

/**
 * The app menu (left flyout) gathers the page-level actions. Each button's
 * enabled state is derived from the editor's edit mode and whether there are
 * pending mutations:
 *  - `publish` / `revert` ("Discard") — enabled only with pending mutations.
 *  - `import_existing` — only in `editing` mode (disabled while translating).
 *  - `translations` — only in `translating` mode.
 *  - `exit` — always available.
 */
describe('The AppMenu', async () => {
  await setupEditorE2E()

  test('disables mutation/translation actions in a clean editing state', async () => {
    const page = await openEditor()
    await openAppMenu(page)

    // No pending mutations → nothing to publish or discard.
    await expectMenuButton(page, 'publish', true)
    await expectMenuButton(page, 'revert', true)
    // Editing the source language, not a translation.
    await expectMenuButton(page, 'translations', true)

    // Importing and exiting are available with a clean state.
    await expectMenuButton(page, 'import_existing', false)
    await expectMenuButton(page, 'exit', false)

    await page.close()
  })

  test('enables publish and discard once there are pending mutations', async () => {
    const page = await openEditor()

    // Add a block to create a pending mutation. The dropped `title` block opens
    // its inline editable, whose overlay intercepts pointer input — close it
    // before reaching for the toolbar.
    await dragNewBlockIntoPage(page, 'title')
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)
    await page.keyboard.press('Escape')

    await openAppMenu(page)

    await expectMenuButton(page, 'publish', false)
    await expectMenuButton(page, 'revert', false)
    await expectMenuButton(page, 'import_existing', false)
    await expectMenuButton(page, 'exit', false)
    // Still editing the source language.
    await expectMenuButton(page, 'translations', true)

    await page.close()
  })

  test('swaps importing for translating when viewing a translation', async () => {
    // The playground derives the language from a `/de` path prefix; this loads
    // the editor in `translating` mode.
    const page = await openEditor('/de/page/1?blokkliEditing=1')
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    await openAppMenu(page)

    // Translating: the batch-translate action is available, importing is not.
    await expectMenuButton(page, 'translations', false)
    await expectMenuButton(page, 'import_existing', true)
    // No mutations yet, so publish/discard remain disabled; exit stays available.
    await expectMenuButton(page, 'publish', true)
    await expectMenuButton(page, 'revert', true)
    await expectMenuButton(page, 'exit', false)

    await page.close()
  })
})
