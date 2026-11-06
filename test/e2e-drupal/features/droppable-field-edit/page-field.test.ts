import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { mediaLibraryItem } from '../../support/dropAreas'
import { emitEvent } from '../../support/events'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The news "Hero" (content/nodes/hero.yml).
const HERO = seedUuid('node', 'hero')
const PATH = editorPath('/en/news/hero', 'hero')

const LIST = '[data-test="droppable-field-edit-list"]'

/** The ID of a media in the media library. */
async function mediaId(page: Page, name: string): Promise<string> {
  const item = await mediaLibraryItem(page, name)
  if (item.itemType !== 'media_library') {
    throw new Error(`${name} is no media.`)
  }
  return item.mediaId
}

/** Opens the dialog of the hero image, as a double-click on it does. */
function openHeroImage(page: Page): Promise<void> {
  return emitEvent(page, 'droppable:open', {
    uuid: HERO,
    entityType: 'node',
    fieldName: 'field_hero_image',
  })
}

/** The IDs of the items that the dialog lists. */
function listedIds(page: Page): Promise<(string | null)[]> {
  return page
    .locator(`${LIST} [data-test="droppable-field-edit-item"]`)
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-test-id')),
    )
}

/**
 * The dialog of a field of the page lists the items that the edit state gives
 * the field, not the stored ones: saving the dialog sends the whole list.
 *
 * Page lifecycle: Anna opens the news "Hero", whose hero image is the lake.
 * The last test replaces it with the hills.
 */
describe('Editing a field of the page', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // Unchanged, the dialog closes without saving anything.
    const close = page.locator('[data-test="artboard-tooltip-close"]')
    if (await close.isVisible()) {
      await close.click()
      await page.locator(LIST).waitFor({ state: 'detached' })
    }
  })

  test('The dialog lists the stored image', async () => {
    const lake = await mediaId(page, 'The lake')
    await openHeroImage(page)
    await expect.poll(() => listedIds(page)).toEqual([lake])
  })

  // Last: it replaces the hero image.
  test('The dialog lists the image of the edit state', async () => {
    const hills = await mediaId(page, 'The hills')
    await page.evaluate(
      async ({ uuid, id }) => {
        const app = window.__BLOKKLI__!.app!
        await app.state.mutateWithLoadingState(() =>
          app.adapter.updateDroppableField!({
            host: { uuid, type: 'node', fieldName: 'field_hero_image' },
            itemIds: [id],
          }),
        )
      },
      { uuid: HERO, id: hills },
    )

    await openHeroImage(page)
    await expect.poll(() => listedIds(page)).toEqual([hills])
  })
})
