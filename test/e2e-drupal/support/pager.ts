import type { Locator, Page } from 'playwright-core'
import { expect } from 'vitest'
import { nextFrames, selectBlock } from './blocks'

// The pager of a field in proxy mode (features/pager): while editing, a band of
// pages, one per block, above the block the field shows.

/** The first band inside a block: the one of its field, before any nested. */
export function band(page: Page, hostUuid: string): Locator {
  return page
    .locator(`[data-bk-uuid="${hostUuid}"] [data-test="field-pager"]`)
    .first()
}

/** The page of a block in its band. */
export function pageOf(page: Page, uuid: string): Locator {
  return page.locator(`[data-test="field-pager-page"][data-bk-uuid="${uuid}"]`)
}

/**
 * The element the editor registered for a block: its page in the band, its own
 * element, or nothing.
 */
export function registeredAs(
  page: Page,
  uuid: string,
): Promise<'page' | 'block' | null> {
  return page.evaluate((uuid) => {
    const element = window.__BLOKKLI__!.app!.dom.registeredBlocks.value[uuid]
    if (!element) {
      return null
    }
    return element.dataset.test === 'field-pager-page' ? 'page' : 'block'
  }, uuid)
}

/** Show a block of a field in proxy mode, by selecting it, once it's rendered. */
export async function show(page: Page, uuid: string): Promise<void> {
  await selectBlock(page, uuid)
  await expect.poll(() => registeredAs(page, uuid)).toBe('block')
}

/**
 * Centre a field's band in the viewport: dragging near an edge scrolls the
 * page, which moves the drop slots away from the pointer.
 */
export async function centerBand(
  page: Page,
  hostUuid: string,
  fieldName = 'field_paragraphs',
): Promise<void> {
  await page.evaluate((key) => {
    const app = window.__BLOKKLI__!.app!
    app.dom.refreshFieldRect(key)
    const rect = app.dom.getFieldRect(key)
    if (rect) {
      app.eventBus.emit('scrollIntoView', { rect, immediate: true })
    }
  }, `${hostUuid}:${fieldName}`)
  await nextFrames(page)
}

/** Click a page with the real pointer, holding a modifier key. */
export async function clickPage(
  page: Page,
  uuid: string,
  modifier?: 'Shift' | 'Control',
): Promise<void> {
  const box = (await pageOf(page, uuid).boundingBox())!
  if (modifier) {
    await page.keyboard.down(modifier)
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  if (modifier) {
    await page.keyboard.up(modifier)
  }
}
