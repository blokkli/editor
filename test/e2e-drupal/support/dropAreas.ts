import type { Locator, Page } from 'playwright-core'
import { withApp } from './session'
import type { DraggableMediaLibraryItem } from '../../../src/runtime/editor/features/media-library/types'
import type { DraggableSearchContentItem } from '../../../src/runtime/editor/features/search/types'

// Drops onto drop areas: the fields whose value a dragged media, search result
// or file replaces. The canvas draws the areas, so a drop goes through the
// event bus, as the dragging overlay's pointer hit-test sends it.

/** A media from the library or a search result, as a drag carries it. */
export type DragItem =
  | Omit<DraggableMediaLibraryItem, 'element'>
  | Omit<DraggableSearchContentItem, 'element'>

/**
 * A media of the library, found by its name. Drupal references it by its
 * numeric ID.
 */
export function mediaLibraryItem(page: Page, name: string): Promise<DragItem> {
  return page.evaluate(async (name) => {
    const app = window.__BLOKKLI__!.app!
    const { items } = await app.adapter.mediaLibraryGetResults!({
      filters: {},
      page: 0,
    })
    const media = items.find((item) => item.label === name)
    if (!media) {
      throw new Error(`The media library has no "${name}".`)
    }
    return {
      itemType: 'media_library' as const,
      mediaId: media.mediaId,
      mediaBundle: media.mediaBundle ?? '',
      itemBundles: media.targetBundles,
      label: media.label,
    }
  }, name)
}

/** A search result of the content search, found by its title. */
export function searchContentItem(
  page: Page,
  title: string,
): Promise<DragItem> {
  return page.evaluate(async (title) => {
    const app = window.__BLOKKLI__!.app!
    for (const tab of await app.adapter.getContentSearchTabs!()) {
      const results = await app.adapter.getContentSearchResults!(tab.id, title)
      const item = results.find((v) => v.title === title)
      if (item) {
        return {
          itemType: 'search_content' as const,
          itemBundles: item.targetBundles,
          searchItem: item,
        }
      }
    }
    throw new Error(`The content search finds no "${title}".`)
  }, title)
}

/**
 * Put the pointer in the middle of the viewport, before a drag starts: a
 * question after the drop shows where it is.
 *
 * While dragging, the overlay follows the pointer, and the browser moves it
 * again whenever the layout under it changes. Left where an earlier click put
 * it, a drag could end at the toolbar.
 */
export async function pointerToCenter(
  page: Page,
): Promise<{ x: number; y: number }> {
  const center = await withApp(page, (app) => ({
    x: Math.round(app.ui.viewport.value.width / 2),
    y: Math.round(app.ui.viewport.value.height / 2),
  }))
  await page.mouse.move(center.x, center.y)
  return center
}

/** Start dragging an item, from the middle of the viewport. */
export async function startDrag(page: Page, item: DragItem): Promise<void> {
  const center = await pointerToCenter(page)
  await page.evaluate(
    ({ item, center }) => {
      window.__BLOKKLI__!.app!.eventBus.emit('dragging:start', {
        items: [{ ...item, element: () => document.body }],
        coords: center,
        mode: 'mouse',
      })
    },
    { item, center },
  )
}

/** The IDs of the drop areas the in-flight drag can be dropped on. */
export function dropAreaIds(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.dragdrop
      .getDropAreas([...app.selection.dragItems.value])
      .map((area) => area.id),
  )
}

/**
 * Drop the in-flight drag on a drop area, as the dragging overlay's renderer
 * does once its pointer hit-test picked the area. The overlay asks what the
 * area wants to know, then drops.
 */
export function dropOnArea(page: Page, id: string): Promise<void> {
  return page.evaluate((id) => {
    const app = window.__BLOKKLI__!.app!
    const area = app.dragdrop
      .getDropAreas([...app.selection.dragItems.value])
      .find((v) => v.id === id)
    if (!area) {
      throw new Error(`No drop area "${id}"`)
    }
    app.eventBus.emit('dragging:dropArea', area)
  }, id)
}

/** The question whether a drop changes a field in all languages. */
export function dropLanguages(page: Page): Locator {
  return page.locator('[data-test="drop-languages"]')
}

/** Answer the question: in all languages, or only in the source language. */
export async function answerDropLanguages(
  page: Page,
  answer: 'all' | 'source',
): Promise<void> {
  await dropLanguages(page)
    .locator(`[data-test="drop-languages-${answer}"]`)
    .click()
  await dropLanguages(page).waitFor({ state: 'detached' })
}
