import type { Locator, Page } from 'playwright-core'

/**
 * Open the left-hand app menu by clicking its toolbar toggle, then wait for the
 * menu's primary button list to be visible (it animates in via an async
 * component). Returns once the menu is interactive.
 */
export async function openAppMenu(page: Page): Promise<void> {
  await page.locator('[data-test="app-menu-toggle"]').click()
  await page.locator('#bk-menu-primary').waitFor({ state: 'visible' })
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
