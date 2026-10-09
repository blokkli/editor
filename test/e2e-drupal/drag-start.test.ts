import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../e2e/support/session'
import { emitEvent } from '../e2e/support/events'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from './support/session'

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
 * input at their viewport coordinates. The blocks are the first two of the
 * page "Blocks" (content/nodes/blocks.yml): a title, then a text.
 */
describe('Starting a drag with the mouse', async () => {
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

  afterEach(async () => {
    // End the drag without a drop, then release the button.
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    await page.mouse.up()
    await emitEvent(page, 'select:unselect')
  })

  test('drags the block the pointer went down on, not the one it moved onto', async () => {
    const upper = seedUuid('paragraph', 'first-title')
    const lower = seedUuid('paragraph', 'first-text')
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
