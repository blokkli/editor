import type { Locator, Page } from 'playwright-core'
import { withApp } from './session'

// Interact with a selected block's options in the block-actions toolbar
// (the `options` feature). Each option is wrapped by
// `data-test="option-<property>"` (keyed by the option's property), and the
// control inside carries its type via `data-test="option-type-<type>"`
// (`checkbox`, `radios`, `text`, …). Select a block first so its options render.
//
// **Toolbar overflow.** The options toolbar is `min-w-[100vw]` with
// `lg:overflow-visible`. A block with many options pushes the right-hand
// items past the viewport edge with no scrollable ancestor for Playwright to
// auto-scroll. The mutator helpers below call `bringOptionIntoView` for you:
// it pans the artboard horizontally (via the `setArtboardOffset` event) so
// the *target option* sits inside the viewport. The toolbar tracks the
// selected block via `useStickyToolbar`, so panning the artboard moves the
// toolbar with it.
//
// **Viewport size matters.** The artboard's `overscrollBounds` clamp pan to
// keep page content roughly visible, so panning far past the page width
// is blocked. The options spec sets a 2400×900 viewport in its setup so the
// toolbar fits inside the artboard's bounds and `bringOptionIntoView` can
// reach every item.

/**
 * Pan the artboard horizontally so a specific element fits inside the
 * viewport. Targeted (not whole-toolbar) because the toolbar can be wider
 * than even a widened test viewport — bringing the right end into view can
 * push the left end off-screen.
 *
 * Reads the element's bounding rect, computes the overflow past either
 * viewport edge (with a 40px margin to clear the scrollbar / be comfortably
 * away from screen edges), and emits a `setArtboardOffset` event with the
 * corrected `x`. The renderer applies it via `artboard.setOffset` immediately
 * (no easing) and the next `canvas:draw` repositions the
 * `useStickyToolbar`-tracked toolbar to match.
 *
 * No-op if the element is already inside the viewport with margin.
 *
 * Targeting the wrapper (`[data-test="option-<prop>"]`) is not enough when
 * the click target is a child that overflows past `overflow-hidden` on an
 * ancestor (e.g. group-dropdown content): the wrapper's BB is clipped while
 * the child's screen position isn't. Pass the actual click-target locator.
 */
async function bringElementIntoView(
  page: Page,
  locator: Locator,
): Promise<void> {
  const rect = await locator.boundingBox()
  if (!rect) return
  const panned = await page.evaluate(
    ({ rect, viewportWidth }) => {
      const app = window.__BLOKKLI__!.app!
      const margin = 40
      const right = rect.x + rect.width
      const overflowRight = right + margin - viewportWidth
      const overflowLeft = margin - rect.x
      const currentX = app.ui.artboardOffset.value.x
      let nextX = currentX
      if (overflowRight > 0) {
        nextX = currentX - overflowRight
      } else if (overflowLeft > 0) {
        nextX = currentX + overflowLeft
      } else {
        return false
      }
      // The OptionsForm's `onPointerUp` sets `actionsToolbarLocked = true` on
      // every pointer release inside the toolbar — and `useStickyToolbar`'s
      // `shouldUpdate` gates on `!actionsToolbarLocked`, so a locked toolbar
      // won't reposition when we pan the artboard. Clear it (along with the
      // sibling `isChangingOptions` flag the same handler sets) before
      // emitting the pan. The next pointerup resets both naturally.
      app.ui.actionsToolbarLocked.value = false
      app.ui.isChangingOptions.value = false
      app.eventBus.emit('setArtboardOffset', { x: nextX, immediate: true })
      return true
    },
    { rect, viewportWidth: page.viewportSize()?.width ?? 1280 },
  )
  if (panned) {
    // Two animation frames: one for the canvas:draw that reads the new
    // offset and writes to ui.artboardOffset, one for useStickyToolbar's
    // reposition.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
  }
}

/** Pan to bring a specific option's wrapper into view. See `bringElementIntoView`. */
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
 */
export async function selectRadiosOption(
  page: Page,
  property: string,
  key: string,
): Promise<void> {
  // First pan to the wrapper, then pan to the specific label — the radios
  // editor's labels can extend past the wrapper's clipped BB inside a
  // group-dropdown (overflow-hidden), so a second pan on the actual click
  // target is required.
  await bringOptionIntoView(page, property)
  const label = blockOptionControl(page, property, 'radios').locator(
    `label:has(input[type="radio"][value="${key}"])`,
  )
  await bringElementIntoView(page, label)
  await label.click()
}

/**
 * Set a `range` option's value. Uses `fill()` on the native `<input type=range>`,
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
    .locator('input[type="range"]')
    .fill(String(value))
}

/**
 * Set a `number` option's value by filling the `<input type=number>` directly.
 * For the increment/decrement buttons, use `clickNumberStepper`.
 */
export async function setNumberValue(
  page: Page,
  property: string,
  value: number | string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'number')
    .locator('input[type="number"]')
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
    .locator('button')
    .nth(direction === 'inc' ? 1 : 0)
    .click()
}

/** Set a `text` option's value (fills the `<input>` inside the editor). */
export async function setTextValue(
  page: Page,
  property: string,
  value: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'text').locator('input').fill(value)
}

/** Set a `color` option's value (hex like `#ff8800`). */
export async function setColorValue(
  page: Page,
  property: string,
  hex: string,
): Promise<void> {
  await bringOptionIntoView(page, property)
  await blockOptionControl(page, property, 'color')
    .locator('input[type="color"]')
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
    .locator('input[type="datetime-local"]')
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
    `label:has(input[type="checkbox"][value="${value}"])`,
  )
  // The label sits inside the dropdown panel (`v-if="isOpen || isGrouped"`).
  // For the grouped layout the panel is always open; for the ungrouped layout
  // it starts collapsed and the wrapper renders a top-level toggle button.
  // `count() === 0` means the panel hasn't mounted yet — toggle to open it.
  if ((await label.count()) === 0) {
    await control.locator('> button').click()
    await label.waitFor()
  }
  await bringElementIntoView(page, label)
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
  // Pan to the group's wrapper element. The group sits in the toolbar's
  // flex flow (after the ungrouped options), so we target it by the same
  // `data-test`/`data-test-group` pair the locator above uses.
  await page.evaluate(
    ({ panLabel }) => {
      const app = window.__BLOKKLI__!.app!
      const el = document.querySelector(
        `[data-test="option-group"][data-test-group="${panLabel}"]`,
      )
      if (!(el instanceof HTMLElement)) return
      const rect = el.getBoundingClientRect()
      const margin = 40
      const overflowRight = rect.right + margin - window.innerWidth
      const overflowLeft = margin - rect.left
      const currentX = app.ui.artboardOffset.value.x
      let nextX = currentX
      if (overflowRight > 0) nextX = currentX - overflowRight
      else if (overflowLeft > 0) nextX = currentX + overflowLeft
      else return
      app.eventBus.emit('setArtboardOffset', { x: nextX, immediate: true })
    },
    { panLabel: label },
  )
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await group.locator('> button').click()
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
