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
  await openComplexOption(page, {
    uuid,
    key: CHART_OPTION_KEY,
    dataType: CHART_DATA_TYPE,
  })
  await chartEditorOverlay(page).waitFor({ state: 'visible' })
  await chartSeriesColor(page, 0).waitFor({ state: 'visible' })
}

/** Close the chart editor and wait for the value to be saved. */
export function closeChartEditor(page: Page): Promise<void> {
  return closeComplexOption(page, CHART_DATA_TYPE)
}

/** The series colour control (in the data table header) at `index`. */
export function chartSeriesColor(page: Page, index: number): Locator {
  return page.locator(`[data-test="chart-series-color-${index}"]`)
}

/** The category colour control (in the data table rows) at `index`. */
export function chartCategoryColor(page: Page, index: number): Locator {
  return page.locator(`[data-test="chart-category-color-${index}"]`)
}

/** Read the current colour id (e.g. `red.500`) of a series colour control. */
export function chartSeriesColorId(
  page: Page,
  index: number,
): Promise<string | null> {
  return chartSeriesColor(page, index).getAttribute('data-test-color')
}

/** Read the current colour id of a category colour control. */
export function chartCategoryColorId(
  page: Page,
  index: number,
): Promise<string | null> {
  return chartCategoryColor(page, index).getAttribute('data-test-color')
}

/** Pick a colour (by id, e.g. `red.500`) for a series via the colour dropdown. */
export function setChartSeriesColor(
  page: Page,
  index: number,
  colorId: string,
): Promise<void> {
  return pickColor(page, `chart-series-color-${index}`, colorId)
}

/** Pick a colour (by id) for a category via the colour dropdown. */
export function setChartCategoryColor(
  page: Page,
  index: number,
  colorId: string,
): Promise<void> {
  return pickColor(page, `chart-category-color-${index}`, colorId)
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
