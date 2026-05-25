import type { Locator, Page } from 'playwright-core'

// The `BundleSelector` overlay (`components/BundleSelector`): a shared component
// shown whenever the editor needs the user to pick what to create — the
// selection "add" buttons when a field allows several bundles, and a clipboard
// paste/drop that resolves to 2+ bundles. Its container is
// `data-test="bundle-selector"`; items (blocks, actions, fragments) each render
// an `AddListItem` keyed by id (`data-test="add-list-item-<id>"`) and are grouped
// under `data-test="bundle-selector-<blocks|actions|fragments>"`.

export type BundleSelectorGroup = 'blocks' | 'actions' | 'fragments'

/** The bundle selector overlay container. */
export function bundleSelector(page: Page): Locator {
  return page.locator('[data-test="bundle-selector"]')
}

/**
 * The item ids shown in the selector, in DOM order (sort at the call site for an
 * order-independent assertion). Item ids are the bundle for blocks (`text`), the
 * action id for actions (`template`/`library`), and `fragment:<name>` for
 * fragments. Pass `group` to scope to one of the selector's groups.
 */
export function bundleSelectorItemIds(
  page: Page,
  group?: BundleSelectorGroup,
): Promise<string[]> {
  const scope = group
    ? `[data-test="bundle-selector-${group}"] `
    : '[data-test="bundle-selector"] '
  return page
    .locator(`${scope}[data-test^="add-list-item-"]`)
    .evaluateAll((els) =>
      els.map((el) =>
        el.getAttribute('data-test')!.replace('add-list-item-', ''),
      ),
    )
}

/**
 * Pick an item in the selector by id — a block bundle (`text`), an action
 * (`template`/`library`), or a fragment (`fragment:<name>`).
 */
export function pickBundle(page: Page, id: string): Promise<void> {
  return bundleSelector(page)
    .locator(`[data-test="add-list-item-${id}"]`)
    .click()
}

/** The selector's search input (shown when there are more than four items). */
export function bundleSelectorSearch(page: Page): Locator {
  return bundleSelector(page).locator('[data-test="text-input"]')
}
