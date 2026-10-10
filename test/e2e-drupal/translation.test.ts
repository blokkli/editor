import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from './support/session'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'

describe('Translations', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  it('come from the fake, never from DeepL', async () => {
    const result = await withApp(page, (app) =>
      app.adapter.requestTranslation!([
        {
          key: 'title',
          text: 'Opening hours',
          isHtml: false,
          sourceLanguage: 'en',
          targetLanguage: 'fr',
        },
        {
          key: 'text',
          text: '<p>Closed on Sundays.</p>',
          isHtml: true,
          sourceLanguage: 'en',
          targetLanguage: 'de',
        },
      ]),
    )
    expect(result).toEqual({
      success: true,
      errors: [],
      data: [
        { key: 'title', translatedText: '[FR] Opening hours' },
        { key: 'text', translatedText: '[DE] <p>Closed on Sundays.</p>' },
      ],
    })
  })

  it('fail when a text asks the fake to', async () => {
    const result = await withApp(page, (app) =>
      app.adapter.requestTranslation!([
        {
          key: 'title',
          text: 'Opening hours [deepl-error]',
          isHtml: false,
          sourceLanguage: 'en',
          targetLanguage: 'fr',
        },
      ]),
    )
    expect(result).toMatchObject({ success: false, data: [] })
  })
})
