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

/**
 * Whether a block-actions item action is disabled (its button carries the
 * native `disabled` attribute). Poll-friendly: `expect.poll(() =>
 * itemActionDisabled(page, 'duplicate')).toBe(true)`.
 */
export function itemActionDisabled(page: Page, id: string): Promise<boolean> {
  return itemAction(page, id).isDisabled()
}

// The item-actions *dropdown* holds the "further actions" registered via
// `defineItemDropdownAction` (export to clipboard, …) — a separate menu from the
// direct `PluginItemAction`s above. The toggle lives on the actions title
// (`data-test="item-actions-dropdown-toggle"`) and each entry is
// `data-test="item-dropdown-action-<id>"`.

/** A dropdown action by its `id` (e.g. `block-transfer-export`). */
export function itemDropdownAction(page: Page, id: string): Locator {
  return page.locator(`[data-test="item-dropdown-action-${id}"]`)
}

/**
 * Open the item-actions dropdown. Selecting a block closes it (the title resets
 * `showDropdown` on selection change), so select first, then open.
 *
 * The dropdown opens *downward* from the selected block's actions bar, so when
 * the block sits low in the viewport the menu overflows the bottom edge and its
 * entries can't be clicked. `PageDown` scrolls the artboard (handled by the
 * artboard renderer's `keyPressed` handler) so the selection rises and the menu
 * has room below it.
 */
export async function openItemDropdown(page: Page): Promise<void> {
  await page.keyboard.press('PageDown')
  await page.locator('[data-test="item-actions-dropdown-toggle"]').click()
}

/** Open the dropdown and click the action with `id`. */
export async function clickItemDropdownAction(
  page: Page,
  id: string,
): Promise<void> {
  await openItemDropdown(page)
  const action = itemDropdownAction(page, id)
  await action.waitFor({ state: 'visible' })
  await action.click()
}
