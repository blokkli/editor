import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openTranslateDialog } from '../../../e2e/support/translations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The page "Widgets" (content/nodes/widgets.yml).
const LINK = seedUuid('paragraph', 'widgets-link')
const BUTTON = seedUuid('paragraph', 'widgets-button')

/** The translate dialog's row for a given `uuid:fieldName` key. */
function batchRow(page: Page, key: string): Locator {
  return page.locator(
    `[data-test="translations-batch-row"][data-test-key="${key}"]`,
  )
}

/**
 * The translate dialog offers only translatable fields. A shared value, such
 * as the widget's link title (`field_link.title`; links are never
 * translatable), would be written for every language by "translating" it.
 *
 * The rows come from the adapter's `loadTextFieldValuesForLanguage`, which
 * leaves out the values `paragraphs_blokkli` marks as untranslatable. The
 * `link` paragraph is the control: its title is a translatable field of its
 * own.
 *
 * Page lifecycle: one editor page, opened directly in German (translating).
 */
describe('link field titles: translating', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/widgets', 'widgets'),
    )
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('an untranslatable link title is not offered as a row', async () => {
    await openTranslateDialog(page)

    await batchRow(page, `${BUTTON}:field_title`).waitFor({ state: 'visible' })
    expect(await batchRow(page, `${LINK}:field_title`).count()).toBe(1)
    expect(await batchRow(page, `${LINK}:field_link.title`).count()).toBe(0)
  })
})
