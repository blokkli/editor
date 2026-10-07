import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './support/session'
import { addBlocks } from './support/blocks'
import { emitEvent } from './support/events'
import { setupEditorE2E } from './support/setup'

/** A block's rectangle in viewport coordinates, as the canvas hit-tests it. */
function blockViewportRect(page: Page, uuid: string) {
  return page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    const rect = app.dom.getBlockRect(uuid, true)
    return rect ? app.ui.getViewportRelativeRect(rect) : null
  }, uuid)
}

/** Whether a block is entirely inside the viewport. */
function isInViewport(page: Page, uuid: string): Promise<boolean> {
  return page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    const rect = app.dom.getBlockRect(uuid, true)
    if (!rect) {
      return false
    }
    const { y, height } = app.ui.getViewportRelativeRect(rect)
    return y > 0 && y + height < app.ui.viewport.value.height
  }, uuid)
}

/** The uuids of the blocks being dragged. */
function draggedUuids(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.selection.dragItems.value.flatMap((item) =>
      item.itemType === 'existing' ? [item.block.uuid] : [],
    ),
  )
}

/**
 * A mouse drag starts once the pointer has moved 6px. It must drag the block
 * the pointer went down on: by then, the pointer can be over another block,
 * e.g. the one above when moving up from a block's top edge.
 *
 * The canvas hit-tests the blocks' rectangles, so the gesture is real pointer
 * input at their viewport coordinates.
 */
describe('Starting a drag with the mouse', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // End the drag without a drop, then release the button.
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    await page.mouse.up()
    await emitEvent(page, 'select:unselect')
  })

  test('drags the block the pointer went down on, not the one it moved onto', async () => {
    const upper = randomUUID()
    const lower = randomUUID()
    await addBlocks(page, [
      { bundle: 'title', uuid: upper },
      { bundle: 'title', uuid: lower },
    ])
    // Pointer input only reaches the canvas inside the viewport.
    await expect.poll(() => blockViewportRect(page, lower)).not.toBeNull()
    await emitEvent(page, 'scrollIntoView', {
      uuid: lower,
      center: true,
      immediate: true,
    })
    await expect.poll(() => isInViewport(page, lower)).toBe(true)
    const upperRect = (await blockViewportRect(page, upper))!
    const lowerRect = (await blockViewportRect(page, lower))!

    // Press just inside the lower block's top edge, then move into the upper
    // block in one step: the first move past 6px is over the upper block.
    const x = Math.round(lowerRect.x + lowerRect.width / 2)
    await page.mouse.move(x, Math.round(lowerRect.y + 3))
    await page.mouse.down()
    await page.mouse.move(x, Math.round(upperRect.y + upperRect.height - 3))

    await expect
      .poll(() => withApp(page, (app) => app.selection.isDragging.value))
      .toBe(true)
    expect(await draggedUuids(page)).toEqual([lower])
  })
})
