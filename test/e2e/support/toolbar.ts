import type { Locator, Page } from 'playwright-core'

/**
 * Locate a toolbar button by its plugin `id` (the `id` prop of
 * `<PluginToolbarButton>`, surfaced as `data-test-toolbar-button`). Returns a
 * Playwright Locator, so callers can click it or assert its state, e.g.
 * `expect(await toolbarButton(page, 'undo').isDisabled()).toBe(true)`.
 */
export function toolbarButton(page: Page, id: string): Locator {
  return page.locator(`[data-test-toolbar-button="${id}"]`)
}

/** Press the editor's Undo toolbar button. */
export function undo(page: Page): Promise<void> {
  return toolbarButton(page, 'undo').click()
}

/**
 * Locate a view-option button by its plugin `id` (the `id` from
 * `defineViewOption`, surfaced as `data-test-view-option`). The button only
 * exists in the DOM while the view-options dropdown is open — call
 * {@link openViewOptions} first.
 */
export function viewOption(page: Page, id: string): Locator {
  return page.locator(`[data-test-view-option="${id}"]`)
}

/**
 * Open the toolbar's view-options dropdown if it isn't already, so the
 * view-option buttons (`data-test-view-option=<id>`) are mounted and clickable.
 * The dropdown is mounted via `v-if`; clicking an option inside doesn't close
 * it (the dismiss handler only triggers on clicks outside).
 */
export async function openViewOptions(page: Page): Promise<void> {
  const toggle = page.locator('[data-test="view-options-toggle"]')
  if ((await toggle.getAttribute('data-test-open')) === 'true') {
    return
  }
  await toggle.click()
  await page.locator('[data-test="view-options-dropdown"]').waitFor()
}

/** Close the view-options dropdown if it's open. */
export async function closeViewOptions(page: Page): Promise<void> {
  const toggle = page.locator('[data-test="view-options-toggle"]')
  if ((await toggle.getAttribute('data-test-open')) !== 'true') {
    return
  }
  await toggle.click()
  await page
    .locator('[data-test="view-options-dropdown"]')
    .waitFor({ state: 'detached' })
}
