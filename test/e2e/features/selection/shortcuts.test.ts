import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { addBlocks, selectBlock } from './../../support/blocks'
import { selectedUuids, topLevelBlockUuids } from './../../support/selection'
import { setupEditorE2E } from './../../support/setup'
import { emitEvent } from './../../support/events'

/**
 * The `selection` feature owns the editor's block-selection keyboard shortcuts
 * (handled in its `keyPressed` listener):
 *  - Tab / Shift+Tab — select the next / previous block (or the most visible
 *    block when nothing is selected yet);
 *  - Ctrl/Cmd+A — widen the selection: with nothing (or a full field) selected
 *    it grabs all top-level blocks; with a block selected it first grabs that
 *    block's field siblings;
 *  - Escape — clear the selection.
 *
 * Real key events are dispatched via Playwright; the keyboard provider relays
 * them to the editor's `keyPressed` event. Selection state is read back from
 * the `selection` provider (`app.selection.uuids`).
 */

/**
 * Append a known structure to the page and return the uuids. A grid holds a
 * title (in its `header` field) and three cards (in its `blocks` field),
 * followed by a text block, so document order is:
 *   grid → title → card1 → card2 → card3 → text
 */
async function addGridStructure(page: Page) {
  const grid = randomUUID()
  const title = randomUUID()
  const cards = [randomUUID(), randomUUID(), randomUUID()] as const
  const text = randomUUID()

  await addBlocks(page, [
    {
      bundle: 'grid',
      uuid: grid,
      children: {
        header: [{ bundle: 'title', uuid: title }],
        blocks: cards.map((uuid) => ({ bundle: 'card', uuid })),
      },
    },
    { bundle: 'text', uuid: text },
  ])

  return { grid, title, cards, text }
}

const sorted = (uuids: string[]) => [...uuids].sort()

/**
 * Page lifecycle: one editor page shared. Every test calls `page.keyboard`
 * shortcuts which the editor's keyboard provider relays to `keyPressed` — it
 * gates on the canvas being focused, which the initial editor mount sets and
 * subsequent tests don't disturb. `afterEach` deselects so tests 1, 3, & 5
 * see an empty initial selection. `addGridStructure` uses `randomUUID()` so
 * tests 2 and 4 don't collide.
 */
describe('The selection feature keyboard shortcuts', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
  })

  test('Tab with nothing selected selects the most visible block', async () => {
    expect(await selectedUuids(page)).toEqual([])

    await page.keyboard.press('Tab')

    // Exactly one block gets selected, and it's one of the blocks currently
    // visible in the viewport (the "most visible" candidate set).
    await expect.poll(async () => (await selectedUuids(page)).length).toBe(1)
    const [selected] = await selectedUuids(page)
    const visible = await withApp(page, (app) => app.dom.getVisibleBlocks())
    expect(visible).toContain(selected)
  })

  test('Tab/Shift+Tab walk through blocks in document order, into nested fields', async () => {
    const { grid, title, cards, text } = await addGridStructure(page)

    const expectSelected = (uuid: string) =>
      expect.poll(() => selectedUuids(page)).toEqual([uuid])

    // Start at the text block; Shift+Tab walks backwards through the document,
    // descending into the grid's nested fields (last card → … → title → grid).
    await selectBlock(page, text)
    await expectSelected(text)

    await page.keyboard.press('Shift+Tab')
    await expectSelected(cards[2])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(cards[1])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(cards[0])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(title)

    await page.keyboard.press('Shift+Tab')
    await expectSelected(grid)

    // Tab steps forward again: grid → title.
    await page.keyboard.press('Tab')
    await expectSelected(title)
  })

  test('Ctrl+A with nothing selected selects all top-level blocks', async () => {
    expect(await selectedUuids(page)).toEqual([])

    await page.keyboard.press('Control+a')

    const expected = sorted(await topLevelBlockUuids(page))
    expect(expected.length).toBeGreaterThan(1)
    await expect
      .poll(async () => sorted(await selectedUuids(page)))
      .toEqual(expected)
  })

  test('Ctrl+A widens from a nested block to its field siblings, then to all top-level blocks', async () => {
    const { cards } = await addGridStructure(page)

    // Selecting one card and pressing Ctrl+A grabs all of that card's siblings
    // in the grid's `blocks` field — and only those (not the title, which lives
    // in the grid's `header` field).
    await selectBlock(page, cards[0])
    await page.keyboard.press('Control+a')
    await expect
      .poll(async () => sorted(await selectedUuids(page)))
      .toEqual(sorted([...cards]))

    // Pressing Ctrl+A again — now that the whole field is selected — widens to
    // every top-level block on the page.
    await page.keyboard.press('Control+a')
    const topLevel = sorted(await topLevelBlockUuids(page))
    expect(topLevel.length).toBeGreaterThan(1)
    await expect
      .poll(async () => sorted(await selectedUuids(page)))
      .toEqual(topLevel)
  })

  test('Escape clears the selection', async () => {
    await page.keyboard.press('Control+a')
    await expect
      .poll(async () => (await selectedUuids(page)).length)
      .toBeGreaterThan(0)

    await page.keyboard.press('Escape')
    await expect.poll(() => selectedUuids(page)).toEqual([])
  })
})
