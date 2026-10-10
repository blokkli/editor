import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { blockOption, openOptionGroup } from '../../support/options'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The page "Statistics" (content/nodes/statistics.yml).
const CHART = seedUuid('paragraph', 'statistics-chart')
const TEXT = seedUuid('paragraph', 'statistics-text')

/**
 * The options of a paragraph the user may not edit are disabled: Drupal
 * rejects a change to them (`UpdateBehaviorSetting` checks the paragraph's
 * update access), so working controls would only fail when used. Jonas, a
 * `restricted_editor`, may not edit charts, but may edit texts.
 *
 * A disabled option outside a group isn't rendered; inside a group it's shown
 * disabled (`data-test-disabled`). The chart's editor is an option outside a
 * group (`data`, a complex option); its height is in the group "Format".
 *
 * Page lifecycle: one editor page, Jonas on the page "Statistics". Nothing is
 * changed; `afterEach` deselects.
 */
describe('The options of a paragraph without edit permission', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Jonas Weber',
      editorPath('/en/statistics', 'statistics'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
  })

  test('are disabled', async () => {
    await selectBlock(page, CHART)
    await openOptionGroup(page, 'Format')

    expect(
      await blockOption(page, 'height').getAttribute('data-test-disabled'),
    ).toBe('true')
    // No button that opens the chart editor.
    expect(await blockOption(page, 'data').count()).toBe(0)
  })

  test('stay enabled on a paragraph the user may edit', async () => {
    await selectBlock(page, TEXT)
    await blockOption(page, 'box').waitFor({ state: 'visible' })
  })
})
