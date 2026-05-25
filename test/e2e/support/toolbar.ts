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
