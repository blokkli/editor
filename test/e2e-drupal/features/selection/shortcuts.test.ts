import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, editorPath, openEditor } from '../../support/session'
import { selectBlock } from '../../support/blocks'
import { selectedUuids, topLevelBlockUuids } from '../../support/selection'
import { emitEvent } from '../../support/events'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

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
 * The page "Nested" (content/nodes/nested.yml): columns hold a title (in their
 * `field_left`) and three texts (in their `field_right`), followed by a text,
 * so document order is:
 *   columns → title → text1 → text2 → text3 → text
 */
const columns = seedUuid('paragraph', 'columns')
const title = seedUuid('paragraph', 'columns-title')
const texts = [
  seedUuid('paragraph', 'columns-text-1'),
  seedUuid('paragraph', 'columns-text-2'),
  seedUuid('paragraph', 'columns-text-3'),
] as const
const text = seedUuid('paragraph', 'nested-text')

const sorted = (uuids: string[]) => [...uuids].sort()

/**
 * Page lifecycle: one editor page shared. Every test calls `page.keyboard`
 * shortcuts which the editor's keyboard provider relays to `keyPressed` — it
 * gates on the canvas being focused, which the initial editor mount sets and
 * subsequent tests don't disturb. `afterEach` deselects so tests 1, 3, & 5
 * see an empty initial selection.
 */
describe('The selection feature keyboard shortcuts', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/nested', 'nested'),
    )
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
    const expectSelected = (uuid: string) =>
      expect.poll(() => selectedUuids(page)).toEqual([uuid])

    // Start at the text block; Shift+Tab walks backwards through the document,
    // descending into the columns' nested fields (last text → … → title →
    // columns).
    await selectBlock(page, text)
    await expectSelected(text)

    await page.keyboard.press('Shift+Tab')
    await expectSelected(texts[2])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(texts[1])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(texts[0])

    await page.keyboard.press('Shift+Tab')
    await expectSelected(title)

    await page.keyboard.press('Shift+Tab')
    await expectSelected(columns)

    // Tab steps forward again: columns → title.
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
    // Selecting one text and pressing Ctrl+A grabs all of its siblings in the
    // columns' `field_right` — and only those (not the title, which lives in
    // their `field_left`).
    await selectBlock(page, texts[0])
    await page.keyboard.press('Control+a')
    await expect
      .poll(async () => sorted(await selectedUuids(page)))
      .toEqual(sorted([...texts]))

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
