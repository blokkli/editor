import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  waitForEditorReady,
  editorPath,
  openEditor,
} from '../../support/session'
import { addBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import {
  chartEditorOverlay,
  chartSeriesColorId,
  closeChartEditor,
  openChartEditor,
  setChartSeriesColor,
} from '../../support/charts'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/** A chart, added to the page's paragraphs field. */
const CHART = { bundle: 'chart', fieldName: 'field_paragraphs' }

/**
 * Close the chart editor, and wait until Drupal has stored the chart: closing
 * always saves its `data` option.
 */
async function closeAndStoreChart(page: Page): Promise<void> {
  const stored = nextMutation(page, 'pbUpdateParagraphOption')
  await closeChartEditor(page)
  await stored
}

/**
 * Reproduces the reported bug: after picking a *ramped* colour (a shade such as
 * `red.500`) for a series, closing the chart editor and re-opening it reset the
 * colour back to the default. The saved value is correct — the reset happens
 * when the editor re-reads the chart data and wrongly treats a shade-qualified
 * id as invalid. Flat colours (`green`, `blue`) are unaffected, which is why
 * the bug is easy to miss.
 *
 * Covered for both re-open paths:
 *  - same session (no reload)
 *  - after a page reload
 */
describe('Charts colour persistence', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/empty', 'empty'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // Make sure no editor is left open between tests.
    if (
      await chartEditorOverlay(page)
        .isVisible()
        .catch(() => false)
    ) {
      await closeAndStoreChart(page)
    }
    await emitEvent(page, 'select:unselect')
  })

  test('keeps a ramped series colour when re-editing in the same session', async () => {
    const uuid = await addBlock(page, CHART)
    expect(uuid).toBeTruthy()

    await openChartEditor(page, uuid!)

    // Pick a shade of a ramped colour — the case that triggers the reset.
    await setChartSeriesColor(page, 0, 'red.500')
    await closeAndStoreChart(page)

    // Re-open WITHOUT reloading — the colour must survive.
    await openChartEditor(page, uuid!)
    expect(await chartSeriesColorId(page, 0)).toBe('red.500')
  })

  test('keeps a ramped series colour after a page reload', async () => {
    const uuid = await addBlock(page, CHART)
    expect(uuid).toBeTruthy()

    await openChartEditor(page, uuid!)
    await setChartSeriesColor(page, 0, 'red.300')
    await closeAndStoreChart(page)

    await page.reload()
    await waitForEditorReady(page)

    await openChartEditor(page, uuid!)
    expect(await chartSeriesColorId(page, 0)).toBe('red.300')
  })
})
