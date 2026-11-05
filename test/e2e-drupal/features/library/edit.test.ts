import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { clickItemAction } from '../../support/itemActions'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, getHostContext, openEditor } from '../../support/session'

// The page "Reusable" (content/nodes/reusable.yml) places the library item
// "Opening hours" (content/library.yml).
const LIBRARY_ITEM = seedUuid('paragraphs_library_item', 'opening-hours')
const FROM_LIBRARY = seedUuid('paragraph', 'reusable-opening-hours')

/** A library item's page: its canonical URL, by its ID. */
const LIBRARY_ITEM_PATH = /^\/en\/blokkli\/library-item\/\d+$/

/**
 * A library item is edited on its page, Drupal's canonical URL of the item:
 * the editor links there with the ID, as Drupal does.
 *
 * Page lifecycle: Anna opens the page "Reusable" in the editor; the second
 * test opens a page of its own. Nothing is changed.
 */
describe('Editing a library item', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/reusable', 'reusable'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  test('"Edit" opens the item\'s page in the editor', async () => {
    await selectBlock(page, FROM_LIBRARY)
    await clickItemAction(page, 'edit')

    const iframe = page.locator(
      '[data-test="nested-editor-overlay-library-item"] iframe',
    )
    await iframe.waitFor({ state: 'attached' })
    const src = new URL((await iframe.getAttribute('src'))!, 'https://x')
    expect(src.pathname).toMatch(LIBRARY_ITEM_PATH)
    expect(src.searchParams.get('blokkliEditing')).toBe(LIBRARY_ITEM)

    // The page loads the item by its ID, and edits it.
    const frame = await (await iframe.elementHandle())!.contentFrame()
    await frame!.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
    expect(
      await frame!.evaluate(
        () => window.__BLOKKLI__!.app!.context.value.entityUuid,
      ),
    ).toBe(LIBRARY_ITEM)
  })

  test("Drupal's link opens the item's page in the editor", async () => {
    // Drupal's "open editing" redirects to the item's canonical URL.
    const drupalPage = await openEditor(
      sandbox,
      'Anna Keller',
      `/en/paragraphs_blokkli/open/paragraphs_library_item/${LIBRARY_ITEM}`,
    )
    try {
      expect(new URL(drupalPage.url()).pathname).toMatch(LIBRARY_ITEM_PATH)
      expect((await getHostContext(drupalPage)).uuid).toBe(LIBRARY_ITEM)
    } finally {
      await drupalPage.close()
    }
  })
})
