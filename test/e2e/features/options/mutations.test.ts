import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, EDITOR_PATH } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock, selectBlock, selectBlocks } from './../../support/blocks'
import {
  blockOption,
  blockOptionControl,
  clickNumberStepper,
  flushOptions,
  lastUpdateOptions,
  openOptionGroup,
  selectRadiosOption,
  setColorValue,
  setDateTimeValue,
  setNumberValue,
  setRangeValue,
  setTextValue,
  setupWidget,
  toggleCheckboxesOption,
  toggleCheckboxOption,
  widgetOptionValue,
  widgetTextColorAttr,
} from './../../support/options'

/**
 * Regression tests for the `options` feature — mutation path.
 *
 * Under test: the options toolbar's per-type editors, the
 * `state.mutatedOptions` → `props.options` → block-template re-render path,
 * and the `flushOptions` path (selection-change unmount + explicit
 * `ui.flushPendingChanges()`).
 *
 * Each per-type test asserts BOTH the block's re-rendered DOM (the Widget's
 * JSON cell for the option) AND the adapter payload's storable form. A bug
 * that updates state but fails to persist (or vice versa) fails the test;
 * a bug that updates the wrong storable form (e.g. checkbox not serialised to
 * `'0'`/`'1'`) fails on the adapter assertion alone.
 *
 * Page lifecycle: editor opened ONCE per file via `beforeAll`, and ONE
 * shared Widget is seeded up front. Each test mutates a *different* option
 * key on that widget — the diff against the baseline is what's flushed, so
 * stale mutations from earlier tests don't pollute later assertions
 * (`getPendingValues()` only includes keys whose current value differs from
 * the baseline at the time of the flush). `lastUpdateOptions` returns the
 * recorder's most recent call; tests don't interleave, so that call is
 * always *this* test's flush.
 *
 * `beforeEach` re-selects the shared widget so tests that intentionally
 * change selection (flush-on-unmount, multi-select, per-block remount)
 * don't leave the next test stranded on a different block.
 *
 * Special cases that don't fit the "one widget" model and seed their own
 * blocks inline:
 *   - The `showAllOptions=false` test collapses the toolbar to just
 *     `showAllOptions`; it restores the toggle at the end so subsequent
 *     tests see the full toolbar.
 *   - The `multi-select` and `per-block remount` tests need TWO widgets in
 *     known default state, so they call `setupWidget` again. The shared
 *     widget (whose `buttonType` / `anchorId` have already been mutated by
 *     earlier tests) would defeat the assertions otherwise.
 */
describe('Options — mutations', async () => {
  await setupEditorE2E()

  let page: Page
  let widgetUuid: string

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH)
    widgetUuid = await setupWidget(page)
  })

  beforeEach(async () => {
    // Restore the shared widget as the sole selection. No-op when it's
    // already selected; otherwise selects it and waits for the Padding
    // group (which lives on the Widget's options) to re-mount.
    await selectBlock(page, widgetUuid)
    await page
      .locator('[data-test="option-group"][data-test-group="Padding"]')
      .waitFor({ state: 'visible' })
  })

  afterAll(async () => {
    await page?.close()
  })

  test('defaults: a freshly added Widget renders defineBlokkli defaults', async () => {
    const uuid = widgetUuid

    // Each cell mirrors `JSON.stringify(options.<key>)` — the source of truth
    // for "what's actually in props". Defaults come straight from
    // `defineBlokkli({ options: { … default … } })` via the editor's edit
    // state mapping. A regression in default propagation surfaces here.
    expect(await widgetOptionValue<boolean>(page, uuid, 'showAllOptions')).toBe(
      true,
    )
    expect(await widgetOptionValue<string>(page, uuid, 'columns')).toBe('two')
    expect(await widgetOptionValue<string>(page, uuid, 'buttonType')).toBe(
      'primary',
    )
    expect(await widgetOptionValue<string>(page, uuid, 'columnsGrid')).toBe(
      'equal',
    )
    expect(await widgetOptionValue<string>(page, uuid, 'color')).toBe('normal')
    expect(await widgetOptionValue<string[]>(page, uuid, 'countries')).toEqual([
      'ch',
      'de',
      'at',
    ])
    expect(await widgetOptionValue<string>(page, uuid, 'anchorId')).toBe('')
    expect(await widgetOptionValue<number>(page, uuid, 'rows')).toBe(0)
    expect(await widgetOptionValue<number>(page, uuid, 'range')).toBe(0)
    expect(await widgetOptionValue<string>(page, uuid, 'textColor')).toBe(
      '#ffffff',
    )
    expect(await widgetOptionValue<number>(page, uuid, 'paddingTop')).toBe(0)
    expect(await widgetOptionValue<boolean>(page, uuid, 'nestedCheckbox')).toBe(
      true,
    )
    expect(
      await widgetOptionValue<string>(page, uuid, 'radiosWithLabelDescription'),
    ).toBe('one')
    expect(await widgetOptionValue<string>(page, uuid, 'background')).toBe(
      'white',
    )
  })

  test('checkbox option flips block prop AND records `0` storable; turning showAllOptions off collapses the toolbar', async () => {
    const uuid = widgetUuid

    // Sanity: other options ARE in the toolbar (determineVisibleOptions
    // returns the full list when showAllOptions is true). Pick `buttonType`
    // — an always-present radios option in the "Radios" group.
    expect(
      await page
        .locator('[data-test="option-group"][data-test-group="Radios"]')
        .count(),
    ).toBeGreaterThan(0)

    await toggleCheckboxOption(page, 'showAllOptions')

    // Block prop reflects the toggle immediately (reactive mutatedOptions).
    await expect
      .poll(() => widgetOptionValue<boolean>(page, uuid, 'showAllOptions'))
      .toBe(false)

    // determineVisibleOptions returns just `['showAllOptions']` when off —
    // every other option (and the groups they sit in) disappears.
    await expect
      .poll(() =>
        page
          .locator('[data-test="option-group"][data-test-group="Radios"]')
          .count(),
      )
      .toBe(0)
    await expect
      .poll(() =>
        page
          .locator('[data-test="option-group"][data-test-group="Padding"]')
          .count(),
      )
      .toBe(0)
    expect(await blockOption(page, 'showAllOptions').count()).toBe(1)
    expect(await blockOption(page, 'buttonType').count()).toBe(0)

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    // `optionValueToStorable` serialises booleans as `'1'`/`'0'`.
    expect(call.options).toContainEqual({
      uuid,
      key: 'showAllOptions',
      value: '0',
    })

    // Restore the toolbar to its full state so subsequent tests in this
    // describe (which share the same widget) can still see other options.
    await toggleCheckboxOption(page, 'showAllOptions')
    await flushOptions(page)
  })

  test('radios (default displayAs): picking another option syncs to props and records the key', async () => {
    const uuid = widgetUuid

    // `buttonType` is in the Radios group — open it first.
    await openOptionGroup(page, 'Radios')
    await selectRadiosOption(page, 'buttonType', 'secondary')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'buttonType'))
      .toBe('secondary')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'buttonType',
      value: 'secondary',
    })
  })

  test('radios with displayAs:"icons" syncs', async () => {
    const uuid = widgetUuid

    await openOptionGroup(page, 'Radios')
    await selectRadiosOption(page, 'columns', 'four')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'columns'))
      .toBe('four')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'columns',
      value: 'four',
    })
  })

  test('radios with displayAs:"grid" syncs', async () => {
    const uuid = widgetUuid

    await openOptionGroup(page, 'Radios')
    await selectRadiosOption(page, 'columnsGrid', 'twoOne')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'columnsGrid'))
      .toBe('twoOne')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'columnsGrid',
      value: 'twoOne',
    })
  })

  test('radios with displayAs:"colors" syncs', async () => {
    const uuid = widgetUuid

    await openOptionGroup(page, 'Radios')
    await selectRadiosOption(page, 'color', 'primary')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'color'))
      .toBe('primary')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'color',
      value: 'primary',
    })
  })

  test('checkboxes: selecting a new value records the comma-joined storable and reaches props as an array', async () => {
    const uuid = widgetUuid

    await toggleCheckboxesOption(page, 'countries', 'fr')

    await expect
      .poll(() => widgetOptionValue<string[]>(page, uuid, 'countries'))
      .toEqual(['ch', 'de', 'at', 'fr'])

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    // checkboxes arrays are joined by `optionValueToStorable` for transport.
    expect(call.options).toContainEqual({
      uuid,
      key: 'countries',
      value: 'ch,de,at,fr',
    })
  })

  test('text option syncs', async () => {
    const uuid = widgetUuid

    await setTextValue(page, 'anchorId', 'main')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'anchorId'))
      .toBe('main')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'anchorId',
      value: 'main',
    })
  })

  test('color option syncs to both the JSON cell and the bound style attribute', async () => {
    const uuid = widgetUuid

    await setColorValue(page, 'textColor', '#ff8800')

    // The Widget mirrors `options.textColor` onto the h2 as both a CSS color
    // and a `data-test-text-color` attribute — proving the option reaches
    // arbitrary template bindings, not just the JSON cell.
    await expect.poll(() => widgetTextColorAttr(page, uuid)).toBe('#ff8800')
    expect(await widgetOptionValue<string>(page, uuid, 'textColor')).toBe(
      '#ff8800',
    )

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'textColor',
      value: '#ff8800',
    })
  })

  test('range option syncs and the JSON cell reflects the step precision', async () => {
    const uuid = widgetUuid

    // `range` is configured with min=0, max=1, step=0.01.
    await setRangeValue(page, 'range', '0.42')

    await expect
      .poll(() => widgetOptionValue<number>(page, uuid, 'range'))
      .toBe(0.42)

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'range',
      value: '0.42',
    })
  })

  test('number option syncs via both fill and the increment button', async () => {
    const uuid = widgetUuid

    await setNumberValue(page, 'rows', '5')
    await expect
      .poll(() => widgetOptionValue<number>(page, uuid, 'rows'))
      .toBe(5)

    await clickNumberStepper(page, 'rows', 'inc')
    await expect
      .poll(() => widgetOptionValue<number>(page, uuid, 'rows'))
      .toBe(6)

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'rows',
      value: '6',
    })
  })

  test('datetime-local option syncs', async () => {
    const uuid = widgetUuid

    await setDateTimeValue(page, 'dateTimeLocal', '2026-08-14T09:30')

    await expect
      .poll(() => widgetOptionValue<string>(page, uuid, 'dateTimeLocal'))
      .toBe('2026-08-14T09:30')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'dateTimeLocal',
      value: '2026-08-14T09:30',
    })
  })

  test('grouped option (Padding): clicking the group opens it; changing a member syncs', async () => {
    const uuid = widgetUuid

    // `paddingTop`/`paddingBottom`/`paddingLeft`/`paddingRight` live behind
    // the `Padding` group dropdown. Until the group opens, the editors aren't
    // mounted.
    expect(await blockOptionControl(page, 'paddingTop', 'range').count()).toBe(
      0,
    )
    await openOptionGroup(page, 'Padding')
    await blockOptionControl(page, 'paddingTop', 'range').waitFor({
      state: 'visible',
    })

    await setRangeValue(page, 'paddingTop', '15')

    await expect
      .poll(() => widgetOptionValue<number>(page, uuid, 'paddingTop'))
      .toBe(15)

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid,
      key: 'paddingTop',
      value: '15',
    })
  })

  test('flush-on-unmount: switching selection persists pending option changes before the form remounts', async () => {
    // A second block to switch the selection TO. Bundle 'text' has its own
    // options form; the important bit is that selecting it triggers the
    // current form's onBeforeUnmount → flushOptions path.
    const otherUuid = await addBlock(page, {
      bundle: 'text',
      fieldName: 'content',
    })
    if (!otherUuid) {
      throw new Error('Failed to add second block')
    }

    await setTextValue(page, 'anchorId', 'flush-test')

    // Verify the prop changed before we move selection.
    await expect
      .poll(() => widgetOptionValue<string>(page, widgetUuid, 'anchorId'))
      .toBe('flush-test')

    // Switch selection — the options form unmounts and flushOptions runs in
    // onBeforeUnmount. NO explicit flushOptions(page) here — this asserts the
    // unmount-driven flush specifically.
    await selectBlock(page, otherUuid)

    const call = await lastUpdateOptions(page)
    expect(call.options).toContainEqual({
      uuid: widgetUuid,
      key: 'anchorId',
      value: 'flush-test',
    })
  })

  test('multi-select: changing a shared option mutates every selected block and the payload covers every uuid', async () => {
    const uuidA = await setupWidget(page)
    const uuidB = await addBlock(page, {
      bundle: 'widget',
      fieldName: 'content',
    })
    if (!uuidB) {
      throw new Error('Failed to add second widget')
    }

    await selectBlocks(page, [uuidA, uuidB])
    // The Radios group toolbar should be visible after the second widget is
    // selected too (same bundle → same options).
    await page
      .locator('[data-test="option-group"][data-test-group="Radios"]')
      .waitFor({ state: 'visible' })

    await openOptionGroup(page, 'Radios')
    await selectRadiosOption(page, 'buttonType', 'secondary')

    // Both blocks' rendered cells reflect the change.
    await expect
      .poll(() => widgetOptionValue<string>(page, uuidA, 'buttonType'))
      .toBe('secondary')
    await expect
      .poll(() => widgetOptionValue<string>(page, uuidB, 'buttonType'))
      .toBe('secondary')

    await flushOptions(page)
    const call = await lastUpdateOptions(page)
    const buttonTypeEntries = call.options.filter((o) => o.key === 'buttonType')
    // ONE write per selected block — regression that dropped one uuid fails here.
    expect(buttonTypeEntries).toHaveLength(2)
    const uuids = new Set(buttonTypeEntries.map((o) => o.uuid))
    expect(uuids.has(uuidA)).toBe(true)
    expect(uuids.has(uuidB)).toBe(true)
    for (const entry of buttonTypeEntries) {
      expect(entry.value).toBe('secondary')
    }
  })

  test('per-block remount: options reflect the block under cursor, not the previous selection', async () => {
    // Bug class: a stale OptionCollector / mutatedOptions cache survives a
    // selection change and shows block A's modified value when block B is now
    // selected (or persists nothing when switching back).
    const uuidA = await setupWidget(page)
    const uuidB = await addBlock(page, {
      bundle: 'widget',
      fieldName: 'content',
    })
    if (!uuidB) {
      throw new Error('Failed to add second widget')
    }

    // Mutate A then move to B; A should retain, B should still be default.
    await setTextValue(page, 'anchorId', 'value-A')
    await expect
      .poll(() => widgetOptionValue<string>(page, uuidA, 'anchorId'))
      .toBe('value-A')

    await selectBlock(page, uuidB)
    // Wait for the form to remount on B.
    await page
      .locator('[data-test="option-group"][data-test-group="Padding"]')
      .waitFor({ state: 'visible' })

    // B's anchorId is still the default empty string.
    expect(await widgetOptionValue<string>(page, uuidB, 'anchorId')).toBe('')
    // And A still holds its mutated value — the unmount-flush persisted it.
    expect(await widgetOptionValue<string>(page, uuidA, 'anchorId')).toBe(
      'value-A',
    )

    // Mutate B; it should not bleed back into A.
    await setTextValue(page, 'anchorId', 'value-B')
    await expect
      .poll(() => widgetOptionValue<string>(page, uuidB, 'anchorId'))
      .toBe('value-B')
    expect(await widgetOptionValue<string>(page, uuidA, 'anchorId')).toBe(
      'value-A',
    )
  })
})
