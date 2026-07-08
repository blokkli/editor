import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, EDITOR_PATH } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  blockOption,
  bringOptionIntoView,
  openOptionGroup,
  resolveOptionText,
  setupWidget,
} from './../../support/options'

/**
 * Tooltip rendering across option types and placements.
 *
 * Under test: the `Tooltip` + `TooltipContext` integration in
 * `features/options/Form/Item.vue` — specifically that
 *
 *   - **ungrouped** items render `Tooltip placement="above-right"` and the
 *     popup only becomes visible on group-hover (CSS `invisible` →
 *     `group-hover/tooltip:visible`),
 *   - **grouped** items render `Tooltip placement="inline"` so the label
 *     appears as a static heading inside the dropdown panel (no hover),
 *   - radios push the **hovered choice's label/description** into the
 *     Tooltip's status slot through the `hovered` / `hoveredDescription`
 *     v-models (radios with `displayAs:'radios'` only push on options that
 *     actually have a description; all other `displayAs` push the label
 *     unconditionally),
 *   - **above-* tooltips are not clipped by the Actions toolbar's clip-path**
 *     — the regression that motivated extending `inset(...)` upward.
 *
 * Selectors: only `[data-test="..."]`. Assertion style: `playwright-core`
 * + `vitest`, so Playwright's matchers aren't available — use
 * `locator.waitFor({ state })` for retried waits and `isVisible()` /
 * `textContent()` for snapshots.
 *
 * Page lifecycle: the editor opens ONCE per file and seeds ONE Widget up
 * front. Tooltip tests only hover/read — no test mutates option state —
 * so the shared widget is fine. Each test's `.hover()` overrides whatever
 * the previous test was hovering, so the tooltip-visibility state is per
 * test.
 */
describe('Options — tooltips', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH)
    await setupWidget(page)
  })

  afterAll(async () => {
    await page?.close()
  })

  test('ungrouped option: tooltip is hidden until the wrapper is hovered, then shows the option label', async () => {
    await bringOptionIntoView(page, 'radiosWithLabelDescription')
    const wrapper = blockOption(page, 'radiosWithLabelDescription')
    const tooltipLabel = wrapper.locator('[data-test="tooltip-label"]')

    // The label exists in the DOM but is `visibility: hidden` via the
    // `invisible` utility — Playwright treats that as not visible.
    expect(await tooltipLabel.isVisible()).toBe(false)
    expect(await tooltipLabel.textContent()).toBe(
      await resolveOptionText(page, 'radiosWithLabelDescription'),
    )

    await wrapper.hover()
    await tooltipLabel.waitFor({ state: 'visible' })
  })

  test('ungrouped option: tooltip surfaces the option description text when one is defined', async () => {
    await bringOptionIntoView(page, 'radiosWithLabelDescription')
    const wrapper = blockOption(page, 'radiosWithLabelDescription')

    await wrapper.hover()
    const description = wrapper.locator('[data-test="tooltip-description"]')
    await description.waitFor({ state: 'visible' })
    expect((await description.textContent())?.trim()).toBe(
      await resolveOptionText(
        page,
        'radiosWithLabelDescription',
        'description',
      ),
    )
  })

  test('ungrouped option without description: hovering shows the label but no description block, and no status slot', async () => {
    // `rows` is an ungrouped, non-radios option with no description defined
    // (`anchorId` gained a description in the Widget's translatable-options
    // demo, so it no longer exercises the "no description" branch).
    await bringOptionIntoView(page, 'rows')
    const wrapper = blockOption(page, 'rows')

    await wrapper.hover()
    const tooltipLabel = wrapper.locator('[data-test="tooltip-label"]')
    await tooltipLabel.waitFor({ state: 'visible' })
    expect(await tooltipLabel.textContent()).toBe(
      await resolveOptionText(page, 'rows'),
    )

    // The option has no description and isn't a radios → neither the
    // description block nor the TooltipContext status slot is rendered.
    expect(
      await wrapper.locator('[data-test="tooltip-description"]').count(),
    ).toBe(0)
    expect(await wrapper.locator('[data-test="tooltip-status"]').count()).toBe(
      0,
    )
  })

  test("radios with descriptions: hovering an option updates the tooltip status to that option's label and description", async () => {
    await bringOptionIntoView(page, 'radiosWithLabelDescription')
    const wrapper = blockOption(page, 'radiosWithLabelDescription')
    // Hover the wrapper first so the tooltip itself is visible (the
    // `group-hover/tooltip:visible` flip).
    await wrapper.hover()

    // Hover the "Two" radio. `Radios.vue#onOptionMouseEnter` writes `Two`
    // into `active` (default `displayAs:'radios'` only pushes when the
    // option carries a description — both `one` and `two` do here).
    const twoOption = wrapper.locator(
      '[data-test="radios-option"][data-test-value="two"]',
    )
    await twoOption.hover()

    await expect
      .poll(() =>
        wrapper.locator('[data-test="tooltip-status-label"]').textContent(),
      )
      .toBe(
        await resolveOptionText(
          page,
          'radiosWithLabelDescription',
          'label',
          'two',
        ),
      )
    const statusDescription = wrapper.locator(
      '[data-test="tooltip-status-description"]',
    )
    await statusDescription.waitFor({ state: 'visible' })
    // The span renders `: {{ description }}` — assert the full text incl.
    // the leading `": "` punctuation.
    expect((await statusDescription.textContent())?.trim()).toBe(
      `: ${await resolveOptionText(
        page,
        'radiosWithLabelDescription',
        'description',
        'two',
      )}`,
    )
  })

  test('grouped option: tooltip is inline (no hover required) and renders the option label inside the popup', async () => {
    // `buttonType` is grouped under `Radios`. Opening the group is what
    // makes its popup contents visible at all; the tooltip inside is
    // `placement="inline"` so its label is always rendered there, no hover.
    await openOptionGroup(page, 'Radios')

    const wrapper = blockOption(page, 'buttonType')
    const tooltipLabel = wrapper.locator('[data-test="tooltip-label"]')
    await tooltipLabel.waitFor({ state: 'visible' })
    expect(await tooltipLabel.textContent()).toBe(
      await resolveOptionText(page, 'buttonType'),
    )
  })

  test('grouped radios with displayAs:"icons": hovering an icon writes its label into the inline tooltip status', async () => {
    await openOptionGroup(page, 'Radios')
    const wrapper = blockOption(page, 'columns')

    // `displayAs:'icons'` makes `!isDefaultRadios` true, so the hover handler
    // pushes the option label even when no description is defined.
    const fourOption = wrapper.locator(
      '[data-test="radios-option"][data-test-value="four"]',
    )
    await fourOption.hover()

    await expect
      .poll(() =>
        wrapper.locator('[data-test="tooltip-status-label"]').textContent(),
      )
      .toBe(await resolveOptionText(page, 'columns', 'label', 'four'))
  })

  test('above-* tooltip extends above the toolbar without being clipped (clip-path regression)', async () => {
    await bringOptionIntoView(page, 'radiosWithLabelDescription')
    const wrapper = blockOption(page, 'radiosWithLabelDescription')

    await wrapper.hover()
    const tooltipLabel = wrapper.locator('[data-test="tooltip-label"]')
    await tooltipLabel.waitFor({ state: 'visible' })

    const tooltipBox = await tooltipLabel.boundingBox()
    const toolbarBox = await page
      .locator('[data-test="actions-toolbar"]')
      .boundingBox()
    if (!tooltipBox || !toolbarBox) {
      throw new Error('Bounding boxes unavailable')
    }

    // The tooltip is `placement="above-right"` → it sits *above* the
    // wrapper. If the toolbar's clip-path were clipping vertically (the
    // pre-fix `inset(0 0 -100vh 0)` did), the tooltip's top would either be
    // pinned to the toolbar top (0px tall) or invisible. With the fix
    // `inset(-100vh 0 -100vh 0)`, the tooltip extends fully above.
    expect(tooltipBox.y).toBeLessThan(toolbarBox.y)
  })
})
