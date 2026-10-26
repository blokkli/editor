import type { Locator, Page } from 'playwright-core'
import {
  closeComplexOption,
  complexOptionOverlay,
  openComplexOption,
} from './complexOptions'

// Helpers to drive the chart editor (a complex-option editor, dataType
// `chart`). The chart block stores its data under the `data` option key.

const CHART_DATA_TYPE = 'chart'
const CHART_OPTION_KEY = 'data'

/** The chart editor overlay. */
export function chartEditorOverlay(page: Page): Locator {
  return complexOptionOverlay(page, CHART_DATA_TYPE)
}

/**
 * Open the chart editor for a chart block and wait until the custom-data table
 * (and its first series colour control) is rendered.
 */
export async function openChartEditor(page: Page, uuid: string): Promise<void> {
  await openOverlay(page, uuid)
  await chartSeriesColor(page, 0).waitFor({ state: 'visible' })
}

/**
 * Open the chart editor for a chart bound to a data source, and wait until it
 * shows the override of the series with `seriesKey`: the source's data has
 * loaded.
 */
export async function openBoundChartEditor(
  page: Page,
  uuid: string,
  seriesKey: string,
): Promise<void> {
  await openOverlay(page, uuid)
  await chartSeriesOverrideHide(page, seriesKey).waitFor({ state: 'visible' })
}

async function openOverlay(page: Page, uuid: string): Promise<void> {
  await openComplexOption(page, {
    uuid,
    key: CHART_OPTION_KEY,
    dataType: CHART_DATA_TYPE,
  })
  await chartEditorOverlay(page).waitFor({ state: 'visible' })
}

/** Close the chart editor, which saves the chart (see `closeComplexOption`). */
export function closeChartEditor(page: Page): Promise<void> {
  return closeComplexOption(page, CHART_DATA_TYPE)
}

/** The series colour control (in the data table header) at `index`. */
export function chartSeriesColor(page: Page, index: number): Locator {
  return page.locator(`[data-test="chart-series-color-${index}"]`)
}

/** Read the current colour id (e.g. `red.500`) of a series colour control. */
export function chartSeriesColorId(
  page: Page,
  index: number,
): Promise<string | null> {
  return chartSeriesColor(page, index).getAttribute('data-test-color')
}

/** Pick a colour (by id, e.g. `red.500`) for a series via the colour dropdown. */
export function setChartSeriesColor(
  page: Page,
  index: number,
  colorId: string,
): Promise<void> {
  return pickColor(page, `chart-series-color-${index}`, colorId)
}

/**
 * The button that hides or shows a bound chart's series, by the series' key.
 * `data-test-hidden` tells whether it's hidden.
 */
export function chartSeriesOverrideHide(page: Page, key: string): Locator {
  return page.locator(`[data-test="chart-series-override-hide-${key}"]`)
}

/** The colour control of a bound chart's category, by the category's key. */
export function chartCategoryOverrideColor(page: Page, key: string): Locator {
  return page.locator(`[data-test="chart-category-override-color-${key}"]`)
}

/** Pick a colour (by id) for a bound chart's category, by its key. */
export function setChartCategoryOverrideColor(
  page: Page,
  key: string,
  colorId: string,
): Promise<void> {
  return pickColor(page, `chart-category-override-color-${key}`, colorId)
}

/** The keys of the overrides that the data of a bound chart no longer has. */
export function chartOrphanOverrideKeys(page: Page): Promise<string[]> {
  return page
    .locator('[data-test="chart-orphan-override"]')
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-test-key') ?? ''),
    )
}

/**
 * Open a colour dropdown identified by `controlTestId`, select the swatch for
 * `colorId`, wait for the control to reflect the new value, then close the
 * (teleported) dropdown so it can't intercept later clicks.
 */
async function pickColor(
  page: Page,
  controlTestId: string,
  colorId: string,
): Promise<void> {
  const control = page.locator(`[data-test="${controlTestId}"]`)
  const trigger = control.locator('button').first()
  await trigger.click()
  await colorSwatch(page, colorId).click()
  await page.waitForFunction(
    ({ testId, colorId }) =>
      document
        .querySelector(`[data-test="${testId}"]`)
        ?.getAttribute('data-test-color') === colorId,
    { testId: controlTestId, colorId },
  )
  await trigger.click()
  await colorSwatch(page, colorId)
    .waitFor({ state: 'detached' })
    .catch(() => {})
}

/** A swatch in the shared colour dropdown, identified by its colour id. */
function colorSwatch(page: Page, colorId: string): Locator {
  return page.locator(
    `[data-test="color-swatch"][data-test-color-id="${colorId}"]`,
  )
}
