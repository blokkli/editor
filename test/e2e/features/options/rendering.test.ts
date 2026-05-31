import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, EDITOR_PATH } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  blockOption,
  blockOptionControl,
  bringOptionIntoView,
  openOptionGroup,
  setupWidget,
} from './../../support/options'

/**
 * Per-type DOM rendering for option controls.
 *
 * Under test: the actual markup each `OptionsForm*` component paints into
 * the toolbar — radios variants (default / icons / grid / colors), the
 * native input wired up by every other type, default-value reflection on
 * radios inputs and on range/number/color/etc., and the `checkboxes`
 * summary chrome.
 *
 * Mutation paths (clicking → storable → block prop) live in
 * `mutations.test.ts`; tooltip rendering lives in `tooltips.test.ts`. The
 * scope here is _what_ each option renders in its **initial** (default)
 * state.
 *
 * Selectors: only `[data-test="..."]` (with optional `data-test-*` qualifier
 * attributes). Per project convention, tag/class/pseudo-class selectors are
 * not used in tests.
 *
 * Page lifecycle: the editor is expensive to boot and these tests don't
 * mutate the block's option state — they read defaults and DOM structure.
 * So we open the editor ONCE per file via `beforeAll` and seed ONE Widget
 * up front; every test reads from it. UI state that tests do flip
 * (group popups opened, the countries dropdown toggled) doesn't bleed
 * across tests in a way that breaks them — group toggles are idempotent
 * and the countries dropdown is only inspected by the test that opens it.
 *
 * The Widget definition (`playground/app/components/Blokkli/Widget/InContentPage.vue`)
 * supplies one example of every radios `displayAs` variant and every other
 * type, so the single shared widget covers the whole surface.
 */
describe('Options — rendering', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH)
    await setupWidget(page)
  })

  afterAll(async () => {
    await page?.close()
  })

  test('radios (default displayAs): each option renders a text label; the default value is the checked radio', async () => {
    await openOptionGroup(page, 'Radios')

    const control = blockOptionControl(page, 'buttonType', 'radios')
    // Two `primary`/`secondary` options (the Radios `v-else` text branch
    // renders `[data-test="radios-label"]` per option).
    expect(await control.locator('[data-test="radios-option"]').count()).toBe(2)
    expect(
      await control
        .locator('[data-test="radios-label"][data-test-value="primary"]')
        .textContent(),
    ).toBe('Primary')
    expect(
      await control
        .locator('[data-test="radios-label"][data-test-value="secondary"]')
        .textContent(),
    ).toBe('Secondary')

    // The widget's `buttonType` default is `'primary'` — that's the only
    // checked input.
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="primary"]')
        .isChecked(),
    ).toBe(true)
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="secondary"]')
        .isChecked(),
    ).toBe(false)
  })

  test('radios displayAs:"icons": each option renders an icon wrapper (no text label) and only the default is checked', async () => {
    await openOptionGroup(page, 'Radios')

    const control = blockOptionControl(page, 'columns', 'radios')

    // Three options (two/three/four). The icons branch renders
    // `[data-test="radios-icon"]` with an inner SVG — the text-label branch
    // is NOT taken for this variant.
    expect(await control.locator('[data-test="radios-icon"]').count()).toBe(3)
    expect(await control.locator('[data-test="radios-label"]').count()).toBe(0)
    expect(await control.locator('[data-test="radios-grid"]').count()).toBe(0)

    // Default is `'two'`.
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="two"]')
        .isChecked(),
    ).toBe(true)
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="three"]')
        .isChecked(),
    ).toBe(false)
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="four"]')
        .isChecked(),
    ).toBe(false)
  })

  test('radios displayAs:"grid": each option renders the column-grid visualization with the right flex ratios', async () => {
    await openOptionGroup(page, 'Radios')

    const control = blockOptionControl(page, 'columnsGrid', 'radios')

    // Four options (equal / oneTwo / twoOne / quarterOne). Each renders a
    // `[data-test="radios-grid"]` row of `[data-test="radios-grid-cell"]`s
    // whose `data-test-flex` attribute mirrors the option's `columns`
    // definition. The text-label branch is NOT taken for this variant.
    expect(await control.locator('[data-test="radios-grid"]').count()).toBe(4)
    expect(await control.locator('[data-test="radios-label"]').count()).toBe(0)

    // `equal: { columns: [1, 1] }` → two equally-flexed children.
    const equalCells = control
      .locator('[data-test="radios-grid"][data-test-value="equal"]')
      .locator('[data-test="radios-grid-cell"]')
    expect(await equalCells.count()).toBe(2)
    expect(await equalCells.nth(0).getAttribute('data-test-flex')).toBe('1')
    expect(await equalCells.nth(1).getAttribute('data-test-flex')).toBe('1')

    // `quarterOne: { columns: [3, 1] }` → 3 + 1 ratio.
    const quarterOneCells = control
      .locator('[data-test="radios-grid"][data-test-value="quarterOne"]')
      .locator('[data-test="radios-grid-cell"]')
    expect(await quarterOneCells.count()).toBe(2)
    expect(await quarterOneCells.nth(0).getAttribute('data-test-flex')).toBe(
      '3',
    )
    expect(await quarterOneCells.nth(1).getAttribute('data-test-flex')).toBe(
      '1',
    )

    // Default `'equal'` is checked.
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="equal"]')
        .isChecked(),
    ).toBe(true)
  })

  test('radios displayAs:"colors": each option\'s swatch carries an inline background-color matching the hex definition', async () => {
    await openOptionGroup(page, 'Radios')

    const control = blockOptionControl(page, 'color', 'radios')

    // Two options (normal/white, primary/blue). The colors branch falls
    // through to the text-label `<span>` but adds an inline
    // `background-color` style on the wrapper div — `[data-test="radios-swatch"]`
    // is only set when `displayAs === 'colors'`.
    expect(await control.locator('[data-test="radios-swatch"]').count()).toBe(2)

    // Browsers canonicalise hex → `rgb(...)`, so we read computed style.
    const normalSwatch = control.locator(
      '[data-test="radios-swatch"][data-test-value="normal"]',
    )
    const primarySwatch = control.locator(
      '[data-test="radios-swatch"][data-test-value="primary"]',
    )
    expect(
      await normalSwatch.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgb(255, 255, 255)')
    expect(
      await primarySwatch.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      ),
    ).toBe('rgb(5, 80, 230)')

    // Default `'normal'` is checked.
    expect(
      await control
        .locator('[data-test="radios-input"][data-test-value="normal"]')
        .isChecked(),
    ).toBe(true)
  })

  test('checkbox option: renders a single labelled checkbox input reflecting the default', async () => {
    const control = blockOptionControl(page, 'showAllOptions', 'checkbox')
    const input = control.locator('[data-test="checkbox-input"]')
    expect(await input.count()).toBe(1)
    // Default `showAllOptions: true` → checked.
    expect(await input.isChecked()).toBe(true)
    // The label text mirrors `option.label`.
    expect(
      await control.locator('[data-test="checkbox-label"]').textContent(),
    ).toBe('Show all options')
  })

  test('range option: renders the range input carrying the min/max/step from defineBlokkli and a formatted-value sibling', async () => {
    const control = blockOptionControl(page, 'range', 'range')
    const input = control.locator('[data-test="range-input"]')
    expect(await input.getAttribute('min')).toBe('0')
    expect(await input.getAttribute('max')).toBe('1')
    expect(await input.getAttribute('step')).toBe('0.01')
    // Default `0` → the value mirror reflects `0.toFixed(2)`.
    expect(
      await control.locator('[data-test="range-value"]').textContent(),
    ).toBe('0.00')
  })

  test('number option: renders min/max on the input and exposes a decrement/increment stepper pair, with decrement disabled at the min default', async () => {
    const control = blockOptionControl(page, 'rows', 'number')
    const input = control.locator('[data-test="number-input"]')
    expect(await input.getAttribute('min')).toBe('0')
    expect(await input.getAttribute('max')).toBe('8')

    // Default `0` → decrement disabled, increment enabled.
    expect(
      await control
        .locator('[data-test="number-decrement"]')
        .getAttribute('disabled'),
    ).not.toBeNull()
    expect(
      await control
        .locator('[data-test="number-increment"]')
        .getAttribute('disabled'),
    ).toBeNull()
  })

  test('text option: renders a native input and the inputType lands on its `type` attribute', async () => {
    const control = blockOptionControl(page, 'anchorId', 'text')
    const input = control.locator('[data-test="text-input"]')
    expect(await input.count()).toBe(1)
    // `anchorId.inputType` is `'text'`.
    expect(await input.getAttribute('type')).toBe('text')
    // Default `''`.
    expect(await input.inputValue()).toBe('')
  })

  test('color option: renders a native color input reflecting the default hex', async () => {
    const control = blockOptionControl(page, 'textColor', 'color')
    const input = control.locator('[data-test="color-input"]')
    expect(await input.count()).toBe(1)
    expect(await input.inputValue()).toBe('#ffffff')
  })

  test('datetime-local option: renders a native datetime-local input', async () => {
    const control = blockOptionControl(page, 'dateTimeLocal', 'datetime-local')
    expect(await control.locator('[data-test="datetime-input"]').count()).toBe(
      1,
    )
  })

  test('checkboxes option: summary shows one pill per default-selected value; toggling mounts the option panel with the same defaults pre-checked', async () => {
    // The toolbar can scroll past `countries` on the default viewport; the
    // event-bus shortcut brings it into reach so the toggle is clickable.
    await bringOptionIntoView(page, 'countries')
    const control = blockOptionControl(page, 'countries', 'checkboxes')

    // Default: 3 selected (ch/de/at), below the 4-Pill threshold — the
    // summary shows individual pills (one per selection). The dropdown
    // panel is `v-if="isOpen || isGrouped"` and starts closed for
    // ungrouped, so the option inputs aren't mounted yet.
    expect(
      await control.locator('[data-test="checkboxes-pills"]').count(),
    ).toBe(1)
    const pills = control.locator('[data-test="checkboxes-pill"]')
    expect(await pills.count()).toBe(3)
    expect(
      await control
        .locator('[data-test="checkboxes-pill"][data-test-value="ch"]')
        .count(),
    ).toBe(1)
    expect(
      await control
        .locator('[data-test="checkboxes-pill"][data-test-value="de"]')
        .count(),
    ).toBe(1)
    expect(
      await control
        .locator('[data-test="checkboxes-pill"][data-test-value="at"]')
        .count(),
    ).toBe(1)
    expect(
      await control.locator('[data-test="checkboxes-input"]').count(),
    ).toBe(0)

    // Clicking the toggle mounts the option panel. 5 options (ch/de/at/it/fr)
    // each render a labelled checkbox; the 3 defaults are pre-checked.
    await control.locator('[data-test="checkboxes-toggle"]').click()
    await control.locator('[data-test="checkboxes-option"]').first().waitFor()
    expect(
      await control.locator('[data-test="checkboxes-option"]').count(),
    ).toBe(5)
    for (const value of ['ch', 'de', 'at']) {
      expect(
        await control
          .locator(`[data-test="checkboxes-input"][data-test-value="${value}"]`)
          .isChecked(),
      ).toBe(true)
    }
    for (const value of ['it', 'fr']) {
      expect(
        await control
          .locator(`[data-test="checkboxes-input"][data-test-value="${value}"]`)
          .isChecked(),
      ).toBe(false)
    }
  })

  test('grouped checkbox (`nestedCheckbox`): renders inside the group popup with its own checkbox input pre-checked', async () => {
    await openOptionGroup(page, 'Radios')

    const control = blockOptionControl(page, 'nestedCheckbox', 'checkbox')
    expect(await control.locator('[data-test="checkbox-input"]').count()).toBe(
      1,
    )
    // Default `true` → checked.
    expect(
      await control.locator('[data-test="checkbox-input"]').isChecked(),
    ).toBe(true)
  })

  test('option wrapper exposes the property in `data-test` for every visible option (sanity)', async () => {
    // `data-test="option-<property>"` is the contract used by both
    // `support/options.ts` helpers and downstream regression tests — assert
    // it's stable for every ungrouped/grouped visible option.
    for (const property of [
      'showAllOptions',
      'textColor',
      'anchorId',
      'countries',
      'range',
      'rows',
      'dateTimeLocal',
      'radiosWithLabelDescription',
    ]) {
      expect(await blockOption(page, property).count()).toBe(1)
    }

    // Grouped options exist in the DOM (the popup wrapper is `v-show`'d
    // inside the group), so they're queryable even before the group opens.
    await openOptionGroup(page, 'Radios')
    for (const property of [
      'buttonType',
      'columns',
      'columnsGrid',
      'color',
      'nestedCheckbox',
    ]) {
      expect(await blockOption(page, property).count()).toBe(1)
    }
  })
})
