import type { Locator, Page } from 'playwright-core'

// Interact with a selected block's options in the block-actions toolbar
// (the `options` feature). Each option is wrapped by
// `data-test="option-<property>"` (keyed by the option's property), and the
// control inside carries its type via `data-test="option-type-<type>"`
// (`checkbox`, `radios`, `text`, …). Select a block first so its options render.

/** A block option by its `property` (the option key, e.g. `box`). */
export function blockOption(page: Page, property: string): Locator {
  return page.locator(`[data-test="option-${property}"]`)
}

/** The typed control inside an option (e.g. `checkbox`, `radios`, `text`). */
export function blockOptionControl(
  page: Page,
  property: string,
  type: string,
): Locator {
  return blockOption(page, property).locator(
    `[data-test="option-type-${type}"]`,
  )
}

/** Toggle a `checkbox` option (clicks the checkbox control within it). */
export function toggleCheckboxOption(
  page: Page,
  property: string,
): Promise<void> {
  return blockOptionControl(page, property, 'checkbox').click()
}
