import { describe, expect, test } from 'vitest'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  addBlock,
  blockExists,
  blockRendered,
  selectBlock,
} from './../../support/blocks'
import { toolbarButton, undo } from './../../support/toolbar'
import { pressShortcut } from './../../support/keyboard'
import { selectedUuids } from './../../support/selection'
import {
  activeHistoryIndex,
  clickCurrentRevision,
  clickHistoryItem,
  currentMutationIndex,
  historyItems,
  mutationCount,
  openHistory,
} from './../../support/history'

/**
 * The history feature (`features/history/index.vue` + its `List`) provides
 * undo/redo via toolbar buttons (`undo`/`redo`, gated by `canUndo`/`canRedo`)
 * and the `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` shortcuts, a sidebar list of every
 * mutation, and selection restoration when jumping between history points.
 *
 * `setHistoryIndex` is not recorded by the `?testing=true` recorder, so every
 * assertion here is outcome-based: the current index (`app.state`), whether a
 * block still exists in the document, and the sidebar's `data-test-history-*`
 * markers — never `waitForAdapterCall` or translated copy. `addBlock` is the
 * cheap way to produce a real mutation (= one history entry).
 */

describe('The history feature', async () => {
  await setupEditorE2E()

  test('both toolbar buttons are disabled with no mutations', async () => {
    const page = await openEditor()

    await expect.poll(() => toolbarButton(page, 'undo').isDisabled()).toBe(true)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)

    await page.close()
  })

  test('undo removes the block, then redo restores it', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    // One mutation applied: the block is rendered, undo enabled, redo disabled.
    expect(await currentMutationIndex(page)).toBe(0)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(true)
    await expect
      .poll(() => toolbarButton(page, 'undo').isDisabled())
      .toBe(false)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)

    await toolbarButton(page, 'undo').click()

    // Reverted: block gone from state *and* the canvas, index back to -1,
    // undo disabled, redo enabled.
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(false)
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)
    await expect.poll(() => toolbarButton(page, 'undo').isDisabled()).toBe(true)
    await expect
      .poll(() => toolbarButton(page, 'redo').isDisabled())
      .toBe(false)

    await toolbarButton(page, 'redo').click()

    // Reapplied: block back in state and re-rendered, index 0, redo disabled.
    await expect.poll(() => blockExists(page, uuid!)).toBe(true)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(true)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)

    await page.close()
  })

  test('the Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z shortcuts undo and redo', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await pressShortcut(page, 'ControlOrMeta+z')
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)

    await pressShortcut(page, 'ControlOrMeta+Shift+z')
    await expect.poll(() => blockExists(page, uuid!)).toBe(true)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)

    await page.close()
  })

  test('the sidebar lists one item per mutation and marks the active one', async () => {
    const page = await openEditor()
    await addBlock(page, { bundle: 'text' })
    await addBlock(page, { bundle: 'text' })

    await openHistory(page)

    await expect.poll(() => historyItems(page).count()).toBe(2)
    expect(await mutationCount(page)).toBe(2)

    // At index 1 the second mutation's item is active; "Current revision" is not.
    await expect.poll(() => activeHistoryIndex(page)).toBe(1)
    expect(
      await page
        .locator('[data-test="history-current-revision"]')
        .getAttribute('data-test-history-active'),
    ).toBe('false')

    await page.close()
  })

  test('clicking an older list item reverts the document to that point', async () => {
    const page = await openEditor()
    const first = await addBlock(page, { bundle: 'text' })
    const second = await addBlock(page, { bundle: 'text' })

    await openHistory(page)
    await clickHistoryItem(page, 0)

    // Only the first mutation stays applied: second block gone from the canvas,
    // first still rendered.
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => blockRendered(page, second!)).toBe(false)
    expect(await blockExists(page, second!)).toBe(false)
    expect(await blockRendered(page, first!)).toBe(true)
    await expect.poll(() => activeHistoryIndex(page)).toBe(0)

    await page.close()
  })

  test('"Current revision" reverts everything, and a later item reapplies it', async () => {
    const page = await openEditor()
    const first = await addBlock(page, { bundle: 'text' })
    const second = await addBlock(page, { bundle: 'text' })

    await openHistory(page)

    // "Current revision" is the originally saved state (index -1): all changes gone.
    await clickCurrentRevision(page)
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)
    await expect.poll(() => blockExists(page, first!)).toBe(false)
    expect(await blockExists(page, second!)).toBe(false)
    await expect.poll(() => activeHistoryIndex(page)).toBe(-1)

    // Jumping forward to the latest mutation reapplies both blocks.
    await clickHistoryItem(page, 1)
    await expect.poll(() => currentMutationIndex(page)).toBe(1)
    await expect.poll(() => blockExists(page, first!)).toBe(true)
    expect(await blockExists(page, second!)).toBe(true)
    await expect.poll(() => activeHistoryIndex(page)).toBe(1)

    await page.close()
  })

  test('selection is restored per history index when jumping back and forth', async () => {
    const page = await openEditor()
    const a = await addBlock(page, { bundle: 'text' }) // index 0
    const b = await addBlock(page, { bundle: 'text' }) // index 1

    // At index 1, select B — recorded as the selection for index 1.
    await selectBlock(page, b!)
    await expect.poll(() => selectedUuids(page)).toEqual([b!])

    // Undo to index 0 (B is gone), then select A there.
    await undo(page)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await selectBlock(page, a!)
    await expect.poll(() => selectedUuids(page)).toEqual([a!])

    // Redo to index 1: the selection stored for that index (B) is restored.
    await toolbarButton(page, 'redo').click()
    await expect.poll(() => currentMutationIndex(page)).toBe(1)
    await expect.poll(() => selectedUuids(page)).toEqual([b!])

    // Undo to index 0 again: A is restored.
    await undo(page)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => selectedUuids(page)).toEqual([a!])

    await page.close()
  })

  test('the sidebar shows an empty state when there are no mutations', async () => {
    const page = await openEditor()
    await openHistory(page)

    await page
      .locator('[data-test="history-empty"]')
      .waitFor({ state: 'visible' })
    expect(await historyItems(page).count()).toBe(0)

    await page.close()
  })
})
