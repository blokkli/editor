import type { Locator, Page } from 'playwright-core'
import { withApp } from './session'
import { addBlock, selectBlock } from './blocks'
import { waitForAdapterCall } from './recorder'

// Interact with a selected block's options in the block-actions toolbar
// (the `options` feature). Each option is wrapped by
// `data-test="option-<property>"` (keyed by the option's property), and the
// control inside carries its type via `data-test="option-type-<type>"`
// (`checkbox`, `radios`, `text`, …). Select a block first so its options render.
//
// **Toolbar overflow.** A block with many options overflows the toolbar
// viewport. The toolbar handles this via its own horizontal scroll
// (transform-translate inside `.bk-blokkli-item-actions-inner`), driven at
// runtime by press-and-hold ScrollArrow buttons. For test ergonomics, the
// editor exposes the `actions:scrollIntoView` event bus event: emit it with
// the target HTMLElement and the Actions component will adjust scrollX so the
// element clears the arrow-overlap zones on both sides. The mutator helpers
// below call `bringElementIntoView` for you. Elements outside the toolbar's
// vertical extent (group-popup contents) are a no-op — the popup drops below
// the toolbar and is already in viewport once the group itself is in view.

/**
 * Ask the actions toolbar to make `locator` reachable. Emits the
 * `actions:scrollIntoView` event bus event with the resolved HTMLElement; the
 * Actions component updates scrollX so the element is clear of the
 * ScrollArrow overlay zones. Waits one animation frame so the transform
 * applies before subsequent interactions.
 *
 * No-op when the element is already in view or sits outside the toolbar's
 * vertical extent (group popups, unrelated nodes).
 */
async function bringElementIntoView(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator.evaluate((el) => {
    if (!(el instanceof HTMLElement)) return
    window.__BLOKKLI__!.app!.eventBus.emit('actions:scrollIntoView', {
      element: el,
    })
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  )
}

/** Scroll a specific option's wrapper into view. See `bringElementIntoView`. */
export function bringOptionIntoView(
  page: Page,
  property: string,
): Promise<void> {
  return bringElementIntoView(page, blockOption(page, property))
}

/** A block option by its `property` (the option key, e.g. `box`). */
export function blockOption(page: Page, property: string): Locator {
  return page.locator(`[data-test="option-${property}"]`)
}

/**
 * Resolve a Widget option's label/description exactly as the editor renders
 * it — via `definitions.getBlockDefinition('widget')` + the same
 * `resolveDefinitionString` the `Options/Form` uses, for the *current*
 * interface language.
 *
 * Option labels/descriptions are `DefinitionString`s (translatable objects),
 * so their rendered text depends on the interface language — German under the
 * forced-German dev server, English against the static build. Hardcoding the
 * expected text would couple the assertion to one language; deriving it from
 * the definition keeps the assertion about *the label renders correctly*
 * rather than *the label is a specific string*.
 *
 * Pass `optionKey` to resolve a nested radios/checkboxes choice's text (e.g.
 * the `two` radio's label); omit it for the option's own label/description.
 */
export function resolveOptionText(
  page: Page,
  property: string,
  which: 'label' | 'description' = 'label',
  optionKey?: string,
): Promise<string> {
  return page.evaluate(
    ({ property, which, optionKey }) => {
      const app = window.__BLOKKLI__!.app!
      const definition = app.definitions.getBlockDefinition(
        'widget',
        null,
        null,
      )
      const option: any = definition?.options?.[property]
      if (!option) {
        return ''
      }

      let target: unknown
      if (optionKey === undefined) {
        target = option[which]
      } else {
        const nested: any = option.options?.[optionKey]
        // Radios choices are `{ label, description }`; checkboxes choices are
        // the `DefinitionString` itself.
        target =
          nested && typeof nested === 'object' && 'label' in nested
            ? nested[which]
            : nested
      }

      return app.definitions.resolveDefinitionString((target ?? '') as any)
    },
    { property, which, optionKey },
  )
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
export async function toggleCheckboxOption(
  page: Page,
  property: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'checkbox').click()
}

/**
 * Pick a radio option's `<label>` by the value of its `<input type=radio>`.
 * Works uniformly across all four `displayAs` variants (default / icons /
 * grid / colors): every variant renders `<label><input value="key">…</label>`
 * — the input itself is sometimes opacity-0 (colors/grid) so we click the
 * wrapping label which is always pointer-interactive.
 *
 * Two scroll-into-view calls: the first centers the option wrapper inside the
 * toolbar (or popup column position), the second targets the specific label —
 * for grouped popups a single radio's icons can extend horizontally beyond
 * the option-wrapper's edge, so the wrapper being in view doesn't guarantee
 * the chosen icon is.
 */
export async function selectRadiosOption(
  page: Page,
  property: string,
  key: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  const label = blockOptionControl(page, property, 'radios').locator(
    `[data-test="radios-option"][data-test-value="${key}"]`,
  )
  await bringElementIntoView(page, label)
  await label.click()
}

/**
 * Set a `range` option's value. Uses `fill()` on the native range input,
 * which dispatches both `input` and `change` events — what the editor's
 * `v-model` binds to.
 */
export async function setRangeValue(
  page: Page,
  property: string,
  value: number | string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'range')
    .locator('[data-test="range-input"]')
    .fill(String(value))
}

/**
 * Set a `number` option's value by filling the native number input directly.
 * For the increment/decrement buttons, use `clickNumberStepper`.
 */
export async function setNumberValue(
  page: Page,
  property: string,
  value: number | string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'number')
    .locator('[data-test="number-input"]')
    .fill(String(value))
}

/**
 * Click a `number` option's increment or decrement button. The editor renders
 * `[ - ] [ input ] [ + ]` — `direction: 'inc'` clicks the trailing `+`,
 * `'dec'` the leading `-`.
 */
export async function clickNumberStepper(
  page: Page,
  property: string,
  direction: 'inc' | 'dec',
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'number')
    .locator(
      `[data-test="number-${direction === 'inc' ? 'increment' : 'decrement'}"]`,
    )
    .click()
}

/** Set a `text` option's value (fills the input inside the editor). */
export async function setTextValue(
  page: Page,
  property: string,
  value: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'text')
    .locator('[data-test="text-input"]')
    .fill(value)
}

/** Set a `color` option's value (hex like `#ff8800`). */
export async function setColorValue(
  page: Page,
  property: string,
  hex: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'color')
    .locator('[data-test="color-input"]')
    .fill(hex)
}

/**
 * Set a `datetime-local` option's value. Format: ISO without timezone, e.g.
 * `'2026-08-14T09:30'` — the format the native input emits.
 */
export async function setDateTimeValue(
  page: Page,
  property: string,
  value: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'datetime-local')
    .locator('[data-test="datetime-input"]')
    .fill(value)
}

/**
 * Toggle a single value in a `checkboxes` option (multi-select). Opens the
 * dropdown if the control is collapsed (ungrouped layout), then clicks the
 * label whose checkbox has the matching `value` attribute. Works for both the
 * grouped layout (always-open) and the ungrouped dropdown.
 */
export async function toggleCheckboxesOption(
  page: Page,
  property: string,
  value: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  const control = blockOptionControl(page, property, 'checkboxes')
  const label = control.locator(
    `[data-test="checkboxes-option"][data-test-value="${value}"]`,
  )
  // The label sits inside the dropdown panel (`v-if="isOpen || isGrouped"`).
  // For the grouped layout the panel is always open; for the ungrouped layout
  // it starts collapsed and the wrapper renders a top-level toggle button.
  // `count() === 0` means the panel hasn't mounted yet — toggle to open it.
  if ((await label.count()) === 0) {
    await control.locator('[data-test="checkboxes-toggle"]').click()
    await label.waitFor()
  }
  await label.click()
}

/**
 * Open an option `group` dropdown (e.g. `Padding`) by clicking its toggle
 * button. No-op if already open. Group labels are literal strings from
 * `defineBlokkli` — not translated — so the `data-test-group` attribute
 * mirrors them verbatim.
 */
export async function openOptionGroup(
  page: Page,
  label: string,
): Promise<void> {
  const group = page.locator(
    `[data-test="option-group"][data-test-group="${label}"]`,
  )
  if ((await group.getAttribute('data-test-active')) === 'true') {
    return
  }
  // Scroll the toolbar so the group button is clear of the arrow-overlap
  // zones before clicking it.
  await bringElementIntoView(page, group)
  await group.locator('[data-test="option-group-toggle"]').click()
  await page
    .locator(
      `[data-test="option-group"][data-test-group="${label}"][data-test-active="true"]`,
    )
    .waitFor()
}

/**
 * Flush any pending option changes by invoking the UI provider's flush API —
 * the same path action buttons (Publish, etc.) await before they run. Returns
 * when every registered flush handler resolves. Use this instead of relying on
 * selection-change side effects to fire `flushOptions`.
 */
export function flushOptions(page: Page): Promise<unknown> {
  return withApp(page, (app) => app.ui.flushPendingChanges())
}

/**
 * Read a Widget's rendered option value cell, parsed as JSON. The Widget's
 * `InContentPage` variant renders each option as `<td data-test="widget-option-<key>">{{
 * JSON.stringify(options.X) }}</td>` so the value can be asserted
 * locale-independently — and any reactivity break in the bind path between
 * `mutatedOptions` → block `props.options` → template surfaces here.
 */
export async function widgetOptionValue<T = unknown>(
  page: Page,
  uuid: string,
  key: string,
): Promise<T | null> {
  const text = await page
    .locator(`[data-bk-uuid="${uuid}"] [data-test="widget-option-${key}"]`)
    .textContent()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text.trim()) as T
  } catch {
    return null
  }
}

/**
 * Read the `data-test-text-color` attribute the Widget mirrors onto its
 * `<h2>` from `options.textColor`. Used to prove the option reaches arbitrary
 * template bindings, not just the JSON cell.
 */
export function widgetTextColorAttr(
  page: Page,
  uuid: string,
): Promise<string | null> {
  return page
    .locator(`[data-bk-uuid="${uuid}"] [data-test-text-color]`)
    .getAttribute('data-test-text-color')
}

/**
 * Payload shape recorded by the mock adapter's `updateOptions` method —
 * one storable triple per (block uuid, option key).
 */
export interface UpdateOptionsCall {
  options: Array<{ uuid: string; key: string; value: string }>
}

/**
 * Wait for and return the most recent `update_options` payload recorded by
 * the mock adapter. Pair with `flushOptions(page)` to assert *what* was
 * persisted. The recorder is cumulative within a page lifetime, so each test
 * reads "the last call" — that is the assertion target (no other test
 * interleaves).
 */
export function lastUpdateOptions(page: Page): Promise<UpdateOptionsCall> {
  return waitForAdapterCall<UpdateOptionsCall>(page, 'update_options')
}

/**
 * Add a Widget block to the contentPage host and select it. Waits until the
 * options toolbar's form has actually rendered (`Padding` group is one of the
 * always-present elements on the Widget's `InContentPage` variant).
 *
 * Returns the new block's uuid. The Widget renders a JSON table of every
 * `options.X` value — each cell has a `data-test="widget-option-<key>"`
 * attribute, so assertions about "did the editor's edit reach the block's
 * props?" become a simple JSON read.
 */
export async function setupWidget(page: Page): Promise<string> {
  const uuid = await addBlock(page, { bundle: 'widget', fieldName: 'content' })
  if (!uuid) {
    throw new Error('Failed to add widget')
  }
  await selectBlock(page, uuid)
  // The block is appended at the end of `content` — typically off-screen on a
  // multi-block page. Explicitly centring it ensures the toolbar that tracks
  // it is also in view (`useStickyToolbar`).
  await page.evaluate((u) => {
    window.__BLOKKLI__!.app!.eventBus.emit('scrollIntoView', {
      uuid: u,
      immediate: true,
      center: true,
    })
  }, uuid)
  // The Padding group is rendered whenever the Widget's full options are
  // visible — a stable signal that the form mounted with the block selected.
  await page
    .locator('[data-test="option-group"][data-test-group="Padding"]')
    .waitFor({ state: 'visible' })
  return uuid
}
