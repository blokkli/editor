import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { emitEvent } from '../../support/events'
import { blockViewportRect, nextFrames } from '../../support/blocks'
import { selectedUuids } from '../../support/selection'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/**
 * The `multi-select` feature selects the blocks that a selection box touches:
 * the user presses the mouse button where there is no block, and drags.
 *
 * Its overlay keeps four rectangles for the border of the selection box in the
 * same collector as the blocks (`select-rect-top`, …). The shader moves them to
 * the selection box, but their stored position doesn't change: the top left of
 * the artboard. A selection box over that area selected them too, as if they
 * were blocks (#56), and "Create template" sent their ids to the backend.
 *
 * The blocks are those of the page "Blocks" (content/nodes/blocks.yml): a
 * title, then two texts. The title starts less than 400px from the top of the
 * artboard, so a box from just above it covers that area.
 */
const blocks = [
  seedUuid('paragraph', 'first-title'),
  seedUuid('paragraph', 'first-text'),
  seedUuid('paragraph', 'second-text'),
]

const sorted = (uuids: string[]) => [...uuids].sort()

describe('Selecting blocks with a selection box', async () => {
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
    await page.mouse.up()
    await emitEvent(page, 'select:unselect')
  })

  test('selects the blocks it touches and nothing else', async () => {
    const first = (await blockViewportRect(page, blocks[0]!))!
    const last = (await blockViewportRect(page, blocks[2]!))!

    // Press where there is no block, right of the title and above it, then
    // drag down and left over all three blocks.
    await page.mouse.move(
      Math.round(first.x + first.width + 40),
      Math.round(first.y - 20),
    )
    await page.mouse.down()
    await page.mouse.move(
      Math.round(first.x + 40),
      Math.round(last.y + last.height + 20),
      { steps: 10 },
    )
    await expect
      .poll(() => withApp(page, (app) => app.selection.isMultiSelecting.value))
      .toBe(true)

    // The overlay only selects when it was open for more than 175ms (a shorter
    // one is a click that moved), with the box of its last frame.
    await page.waitForTimeout(250)
    await nextFrames(page)
    await page.mouse.up()

    await expect
      .poll(async () => sorted(await selectedUuids(page)))
      .toEqual(sorted(blocks))
  })
})
