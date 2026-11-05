import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { editorPath, openEditor } from '../../support/session'
import { emitEvent } from '../../support/events'
import {
  chartCategoryOverrideColor,
  chartEditorOverlay,
  chartOrphanOverrideKeys,
  chartSeriesOverrideHide,
  closeChartEditor,
  openBoundChartEditor,
  setChartCategoryOverrideColor,
} from '../../support/charts'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/** A pie bound to the budget: its categories are the areas. */
const BUDGET = seedUuid('paragraph', 'data-sources-budget')

/** A bar chart bound to the population: its series are the nationalities. */
const POPULATION = seedUuid('paragraph', 'data-sources-population')

/**
 * Close the chart editor after a change, and return the chart that Drupal
 * stored: closing saves its `data` option.
 */
async function closeAndStoreChart(page: Page): Promise<BlokkliChartData> {
  const stored = nextMutation(page, 'pbUpdateParagraphOption')
  await closeChartEditor(page)
  return JSON.parse((await stored).value)
}

/**
 * The overrides of a chart bound to a data source are keyed by the keys of the
 * source's data. Its labels are in the page's language, so an override keyed
 * by a label would only apply in the language it was set in.
 */
describe('Charts bound to a data source', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/data-sources', 'data-sources'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (
      await chartEditorOverlay(page)
        .isVisible()
        .catch(() => false)
    ) {
      await closeChartEditor(page)
    }
    await emitEvent(page, 'select:unselect')
  })

  test('lists an override whose key the data lacks', async () => {
    await openBoundChartEditor(page, BUDGET, 'expenses')
    expect(await chartOrphanOverrideKeys(page)).toEqual(['retired'])
  })

  test("stores a category's colour by its key", async () => {
    await openBoundChartEditor(page, BUDGET, 'expenses')
    await setChartCategoryOverrideColor(page, 'transport', 'red.500')
    const chart = await closeAndStoreChart(page)
    expect(chart.dataSource?.categoryColorOverrides).toEqual({
      education: 'forest',
      retired: 'forest',
      transport: 'red.500',
    })

    await openBoundChartEditor(page, BUDGET, 'expenses')
    expect(
      await chartCategoryOverrideColor(page, 'transport').getAttribute(
        'data-test-color',
      ),
    ).toBe('red.500')
  })

  test('hides a series by its key', async () => {
    await openBoundChartEditor(page, POPULATION, 'foreign')
    await chartSeriesOverrideHide(page, 'foreign').click()
    const chart = await closeAndStoreChart(page)
    expect(chart.dataSource?.seriesOverrides).toEqual({
      foreign: { hidden: true },
    })

    await openBoundChartEditor(page, POPULATION, 'foreign')
    expect(
      await chartSeriesOverrideHide(page, 'foreign').getAttribute(
        'data-test-hidden',
      ),
    ).toBe('true')
  })
})
