import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { dialog } from '../../support/overlays'
import {
  buildSingleLangCsv,
  switchToCsvImportTab,
  uploadTranslationsFile,
} from '../../support/translations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import {
  CANARY_WORD,
  canaryRawHtml,
  canaryText,
  installCanary,
  settledCanaries,
} from '../../support/xss'

// A title and the text of the page "Notices" (content/nodes/notices.yml),
// English only.
const TITLE = seedUuid('paragraph', 'notices-first-title')
const TEXT = seedUuid('paragraph', 'notices-text')

/**
 * X5 (plans/xss): the diff views rendered values with `v-html` as they came.
 * The import's preview diffs a file's values against the current ones, so a
 * file from someone else ran as soon as it was selected, before anything was
 * applied. The views now sanitise what they show, and show a plain field's
 * values as text.
 *
 * The spec uploads a CSV in the German translation: the payload as text for a
 * title (a plain field), and as raw markup for a text. Nothing is applied.
 */
describe('XSS canary: the import preview (X5)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/mitteilungen', 'notices'),
    )
    await installCanary(page)
  })

  afterAll(async () => {
    await page.close()
  })

  test('the preview shows the values without running them', async () => {
    const csv = buildSingleLangCsv([
      {
        key: `${TITLE}:field_title`,
        source: 'First notice',
        translation: canaryText('import-title'),
      },
      {
        key: `${TEXT}:field_text`,
        source: '<p>A notice in English only.</p>',
        translation: canaryRawHtml('import-text'),
      },
    ])
    await page.locator('[data-test="translations-banner-csv"]').click()
    await dialog(page, 'translations-csv').waitFor({ state: 'visible' })
    await switchToCsvImportTab(page)
    await uploadTranslationsFile(page, { name: 'canary.csv', content: csv })

    const row = (key: string) =>
      page.locator(
        `[data-test="translations-csv-import-row"][data-test-key="${key}"]`,
      )
    // The title's value is text: the payload shows as typed.
    await expect
      .poll(async () => (await row(`${TITLE}:field_title`).textContent()) ?? '')
      .toContain(canaryText('import-title'))
    await expect
      .poll(async () => (await row(`${TEXT}:field_text`).textContent()) ?? '')
      .toContain(CANARY_WORD)

    const ran = await settledCanaries(page)
    expect(ran).not.toContain('import-title')
    expect(ran).not.toContain('import-text')
  })
})
