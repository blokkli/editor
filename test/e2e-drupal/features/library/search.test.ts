import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/**
 * The search of the dialog "From library".
 *
 * Page lifecycle: Anna opens the German translation of the page "Library"
 * (content/nodes/translated.yml). Nothing is changed.
 */
describe('Searching the library', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/bibliothek', 'translated'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test("Items come in the page's language", async () => {
    // The library item "Opening hours" (content/library.yml), found by its
    // label in any language.
    for (const text of ['', 'hours', 'zeiten']) {
      const labels = await page.evaluate(async (text) => {
        const { adapter } = window.__BLOKKLI__!.app!
        const results = await adapter.getLibraryItems!({
          bundles: ['text'],
          page: 0,
          filters: text ? { text } : {},
        })
        return results.items.map((v) => v.label)
      }, text)
      expect(labels).toEqual(['Öffnungszeiten'])
    }
  })
})
