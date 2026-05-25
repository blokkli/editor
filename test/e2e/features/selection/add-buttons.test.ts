import { randomUUID } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { addBlocks, selectBlock } from './../../support/blocks'
import { emitEvent } from './../../support/events'
import { setupEditorE2E } from './../../support/setup'

/**
 * The "add buttons" (selection/AddButtons feature) are drawn on the WebGL
 * canvas — there is no DOM element to click. To click one we reproduce the
 * Renderer's geometry: the before/after buttons sit at the selected block's
 * edge centers (left/right for a horizontally-laid-out field, top/bottom for a
 * vertical one), converted to a screen coordinate via the artboard
 * scale/offset. When the target field allows more than one bundle, clicking the
 * button opens the `BundleSelector` overlay (`data-test="bundle-selector"`).
 */

/**
 * Screen coordinates of a selected block's `before`/`after` add button. Reads
 * the live block rect + artboard transform and mirrors the Renderer's
 * edge-center placement, picking the axis from the parent field's orientation.
 */
function addButtonScreenPoint(
  page: Page,
  uuid: string,
  position: 'before' | 'after',
): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ({ uuid, position }) => {
      const app = window.__BLOKKLI__!.app!
      const block = app.blocks.getBlock(uuid)
      if (!block) {
        throw new Error(`Block ${uuid} not found`)
      }
      const field = app.fields.find(block.host.uuid, block.host.fieldName)
      if (!field) {
        throw new Error(`Field for block ${uuid} not found`)
      }

      app.dom.refreshBlockRect(uuid)
      const rect = app.dom.getBlockRect(uuid)
      if (!rect) {
        throw new Error(`No rect for block ${uuid}`)
      }

      const scale = app.ui.artboardScale.value
      const offset = app.ui.artboardOffset.value
      const shift = 2 / scale // BUTTON_SHIFT in the Renderer

      // Mirror getChildrenOrientation() on the field's container element.
      const cs = getComputedStyle(field.element)
      let horizontal = false
      if (cs.display.includes('flex')) {
        horizontal =
          cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse'
      } else if (cs.display.includes('grid')) {
        horizontal = cs.gridTemplateColumns.split(' ').length > 1
      }

      let artX: number
      let artY: number
      if (horizontal) {
        artY = rect.y + rect.height / 2
        artX =
          position === 'before' ? rect.x - shift : rect.x + rect.width + shift
      } else {
        artX = rect.x + rect.width / 2
        artY =
          position === 'before' ? rect.y - shift : rect.y + rect.height + shift
      }

      return { x: artX * scale + offset.x, y: artY * scale + offset.y }
    },
    { uuid, position },
  )
}

describe('The selection add buttons', async () => {
  await setupEditorE2E()

  test('clicking a card add button opens the bundle selector', async () => {
    const page = await openEditor()

    // A grid with three cards in its (horizontal) `blocks` field.
    const grid = randomUUID()
    const cards = [randomUUID(), randomUUID(), randomUUID()] as const
    await addBlocks(page, [
      {
        bundle: 'grid',
        uuid: grid,
        children: { blocks: cards.map((uuid) => ({ bundle: 'card', uuid })) },
      },
    ])

    const bundleSelector = page.locator('[data-test="bundle-selector"]')
    expect(await bundleSelector.count()).toBe(0)

    // Select the last card and bring it into view so the canvas button is
    // on-screen, then click the "after" button on its right edge.
    await selectBlock(page, cards[2])
    await emitEvent(page, 'scrollIntoView', { uuid: cards[2], immediate: true })

    const point = await addButtonScreenPoint(page, cards[2], 'after')
    await page.mouse.click(point.x, point.y)

    // The card's `blocks` field allows several bundles, so the selector opens.
    await bundleSelector.waitFor({ state: 'visible' })

    await page.close()
  })
})
