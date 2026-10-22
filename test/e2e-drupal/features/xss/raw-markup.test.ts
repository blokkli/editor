import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openTranslateDialog, switchLanguage } from '../../support/translations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import {
  canariesRan,
  canaryRawHtml,
  installCanary,
  resetCanary,
  storeFieldValue,
} from '../../support/xss'

// The text of the page "Notices" (content/nodes/notices.yml): English only.
const TEXT = seedUuid('paragraph', 'notices-text')

/**
 * X6 (plans/xss, F96 of the drupal-setup findings): the editor parses stored
 * values in the live document. The translate dialog turns every source and
 * current value into plain text through a detached `<div>`'s `innerHTML`
 * (`stripHtml()`), which loads the markup's images. Drupal stores a formatted
 * field's raw markup as it gets it and filters it only when it renders the
 * field, so the page itself shows the filtered text.
 *
 * The spec stores the payload as raw markup in the English text, then opens
 * "Translate texts" in the German translation.
 */
describe('XSS canary: raw markup in the translate dialog (X6)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/notices', 'notices'),
    )
    await installCanary(page)
    await storeFieldValue(page, TEXT, 'field_text', canaryRawHtml('raw-text'))
    await switchLanguage(page, 'de')
  })

  afterAll(async () => {
    await page.close()
  })

  test('opening the dialog runs the source text', async () => {
    await resetCanary(page)
    await openTranslateDialog(page)
    await page
      .locator(
        `[data-test="translations-batch-row"][data-test-key="${TEXT}:field_text"]`,
      )
      .waitFor({ state: 'visible' })

    // Runs today. The fix flips this to `not.toContain`.
    await expect.poll(() => canariesRan(page)).toContain('raw-text')
  })
})
