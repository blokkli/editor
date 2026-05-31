import type { Locator, Page } from 'playwright-core'

/**
 * Locator for the menu pane itself — used to wait for it to appear/disappear
 * around open/close. The pane is mounted by `<AppMenuInner v-if>` and animates
 * in/out via a transition, so visibility tracks the open state.
 */
export function appMenu(page: Page): Locator {
  return page.locator('[data-test="app-menu"]')
}

/**
 * Open the left-hand app menu by clicking its toolbar toggle, then wait for the
 * menu pane to be visible (it mounts via an async component + transition).
 * Returns once the menu is interactive.
 */
export async function openAppMenu(page: Page): Promise<void> {
  await page.locator('[data-test="app-menu-toggle"]').click()
  await appMenu(page).waitFor({ state: 'visible' })
}

/**
 * Close the app menu via its close button and wait for the menu pane to be
 * gone. Used between tests on a shared page so the next `openAppMenu` starts
 * from a known-closed state.
 */
export async function closeAppMenu(page: Page): Promise<void> {
  await page.locator('[data-test="app-menu-close"]').click()
  await appMenu(page).waitFor({ state: 'hidden' })
}

/**
 * Locate an app-menu button by its plugin `id` (the `id` of the
 * `defineMenuButton` definition, surfaced as `data-test="app-menu-button-<id>"`),
 * e.g. `publish`, `revert`, `import_existing`, `translations`, `exit`. Returns a
 * Locator, so callers can assert its disabled state or click it.
 */
export function appMenuButton(page: Page, id: string): Locator {
  return page.locator(`[data-test="app-menu-button-${id}"]`)
}
