import type { Locator, Page } from 'playwright-core'

// Interact with a selected block's actions (the block-actions toolbar populated
// by `<PluginItemAction>` plugins: delete, duplicate, edit, …). Each action is
// surfaced as `data-test="plugin-item-action-<id>"` and only renders once at
// least one block is selected.

/** A block-actions item action by its plugin `id` (e.g. `delete`, `duplicate`). */
export function itemAction(page: Page, id: string): Locator {
  return page.locator(`[data-test="plugin-item-action-${id}"]`)
}

/** Click a block-actions item action by its plugin `id`. */
export function clickItemAction(page: Page, id: string): Promise<void> {
  return itemAction(page, id).click()
}
