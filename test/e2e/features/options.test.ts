import { describe, expect, test } from 'vitest'
import { openEditor, EDITOR_PATH } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { addBlock, selectBlock, selectBlocks } from './../support/blocks'
import { waitForAdapterCall } from './../support/recorder'
import {
  blockOption,
  blockOptionControl,
  clickNumberStepper,
  flushOptions,
  openOptionGroup,
  selectRadiosOption,
  setColorValue,
  setDateTimeValue,
  setNumberValue,
  setRangeValue,
  setTextValue,
  toggleCheckboxesOption,
  toggleCheckboxOption,
  widgetOptionValue,
  widgetTextColorAttr,
} from './../support/options'
import type { Page } from 'playwright-core'

/**
 * Payload shape recorded by the mock adapter's `updateOptions` method —
 * one storable triple per (block uuid, option key).
 */
interface UpdateOptionsCall {
  options: Array<{ uuid: string; key: string; value: string }>
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
async function setupWidget(page: Page): Promise<string> {
  // The Widget renders many toolbar items and overflows the default 1280px
  // viewport. The Actions toolbar caps at the editor's safe area and exposes
  // overflowing items via its own horizontal scroll (driven at runtime by
  // ScrollArrow press-and-hold). For tests, `bringElementIntoView` emits the
  // `actions:scrollIntoView` event so any target is reachable without
  // resizing the viewport or panning the artboard.
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

/**
 * The most recent `update_options` payload recorded by the mock adapter. Used
 * after `flushOptions(page)` to assert *what* was persisted. The recorder is
 * cumulative within a page lifetime, so each test reads "the last call" — that
 * is the assertion target (no other test interleaves).
 */
async function lastUpdateOptions(page: Page): Promise<UpdateOptionsCall> {
  return waitForAdapterCall<UpdateOptionsCall>(page, 'update_options')
}

/**
 * Regression tests for the `options` feature.
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
 */
describe('Options feature', async () => {
  await setupEditorE2E()

  test('defaults: a freshly added Widget renders defineBlokkli defaults', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('checkbox option flips block prop AND records `0` storable; turning showAllOptions off collapses the toolbar', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('radios (default displayAs): picking another option syncs to props and records the key', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('radios with displayAs:"icons" syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('radios with displayAs:"grid" syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('radios with displayAs:"colors" syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('checkboxes: selecting a new value records the comma-joined storable and reaches props as an array', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('text option syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('color option syncs to both the JSON cell and the bound style attribute', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('range option syncs and the JSON cell reflects the step precision', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('number option syncs via both fill and the increment button', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('datetime-local option syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('grouped option (Padding): clicking the group opens it; changing a member syncs', async () => {
    const page = await openEditor(EDITOR_PATH)
    const uuid = await setupWidget(page)

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

    await page.close()
  })

  test('flush-on-unmount: switching selection persists pending option changes before the form remounts', async () => {
    const page = await openEditor(EDITOR_PATH)
    const widgetUuid = await setupWidget(page)
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

    await page.close()
  })

  test('multi-select: changing a shared option mutates every selected block and the payload covers every uuid', async () => {
    const page = await openEditor(EDITOR_PATH)
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

    await page.close()
  })

  test('per-block remount: options reflect the block under cursor, not the previous selection', async () => {
    // Bug class: a stale OptionCollector / mutatedOptions cache survives a
    // selection change and shows block A's modified value when block B is now
    // selected (or persists nothing when switching back).
    const page = await openEditor(EDITOR_PATH)
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

    await page.close()
  })
})
