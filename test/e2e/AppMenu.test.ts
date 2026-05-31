import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './support/session'
import {
  openAppMenu,
  closeAppMenu,
  appMenu,
  appMenuButton,
} from './support/menu'
import { addBlock } from './support/blocks'
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
 *
 * Page lifecycle: an editing-mode page is opened once in `beforeAll` and
 * shared by the two editing-mode tests. They must run IN ORDER — the
 * "enables publish/discard" test introduces a pending mutation that would
 * pollute the clean-state assertion. `afterEach` closes the menu so each
 * test re-opens it from a known closed state. The translating test needs a
 * different URL (`/de/...`) and opens its own page.
 */
describe('The AppMenu', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // Test 3 runs on its own page and leaves the shared one untouched; the
    // editing-mode tests leave the menu open. Only close it when present.
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
  })

  test('disables mutation/translation actions in a clean editing state', async () => {
    await openAppMenu(page)

    // No pending mutations → nothing to publish or discard.
    await expectMenuButton(page, 'publish', true)
    await expectMenuButton(page, 'revert', true)
    // Editing the source language, not a translation.
    await expectMenuButton(page, 'translations', true)

    // Importing and exiting are available with a clean state.
    await expectMenuButton(page, 'import_existing', false)
    await expectMenuButton(page, 'exit', false)
  })

  test('enables publish and discard once there are pending mutations', async () => {
    // Use the adapter-mutation helper instead of a real drag — we just need
    // *a* pending mutation; the gesture isn't under test.
    await addBlock(page, { bundle: 'text' })
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)

    await expectMenuButton(page, 'publish', false)
    await expectMenuButton(page, 'revert', false)
    await expectMenuButton(page, 'import_existing', false)
    await expectMenuButton(page, 'exit', false)
    // Still editing the source language.
    await expectMenuButton(page, 'translations', true)
  })

  test('swaps importing for translating when viewing a translation', async () => {
    // The playground derives the language from a `/de` path prefix; this loads
    // the editor in `translating` mode. Own page — the shared one is `editing`.
    const dePage = await openEditor('/de/page/1?blokkliEditing=1')
    try {
      await expect
        .poll(() => withApp(dePage, (app) => app.state.editMode.value))
        .toBe('translating')

      await openAppMenu(dePage)

      // Translating: the batch-translate action is available, importing is not.
      await expectMenuButton(dePage, 'translations', false)
      await expectMenuButton(dePage, 'import_existing', true)
      // No mutations yet, so publish/discard remain disabled; exit stays available.
      await expectMenuButton(dePage, 'publish', true)
      await expectMenuButton(dePage, 'revert', true)
      await expectMenuButton(dePage, 'exit', false)
    } finally {
      await dePage.close()
    }
  })
})
