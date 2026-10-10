import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  addBlock,
  blockExists,
  blockRendered,
  selectBlock,
} from '../../support/blocks'
import { toolbarButton, undo } from '../../support/toolbar'
import { pressShortcut } from '../../support/keyboard'
import { selectedUuids } from '../../support/selection'
import {
  activeHistoryIndex,
  clickCurrentRevision,
  clickHistoryItem,
  currentMutationIndex,
  historyItems,
  mutationCount,
  openHistory,
} from '../../support/history'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, revertAllChanges } from '../../support/session'

/** A text, added to the page's paragraphs field. */
const TEXT = { bundle: 'text', fieldName: 'field_paragraphs' }

/**
 * Runs an action that moves through the history, and waits until Drupal has
 * stored the new index (`pbSetHistoryIndex`).
 */
async function moveInHistory(
  page: Page,
  action: () => Promise<void>,
): Promise<void> {
  const moved = nextMutation(page, 'pbSetHistoryIndex')
  await action()
  await moved
}

/**
 * The history feature (`features/history/index.vue` + its `List`) provides
 * undo/redo via toolbar buttons (`undo`/`redo`, gated by `canUndo`/`canRedo`)
 * and the `Cmd/Ctrl+Z` / `Cmd/Ctrl+Shift+Z` shortcuts, a sidebar list of every
 * mutation, and selection restoration when jumping between history points.
 *
 * Every assertion here is outcome-based: the current index (`app.state`),
 * whether a block still exists in the document, and the sidebar's
 * `data-test-history-*` markers — never translated copy. `addBlock` is the
 * cheap way to produce a real mutation (= one history entry). On the page
 * "Empty" (content/nodes/empty.yml).
 */

/**
 * Page lifecycle: one editor page shared. Every test except 1 & 8 makes
 * mutations whose exact count is asserted (0, 1, or 2), so `afterEach`
 * discards the edit state (`revertAllChanges`): the next test starts with no
 * mutations.
 */
describe('The history feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/empty', 'empty'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await revertAllChanges(page)
  })

  test('both toolbar buttons are disabled with no mutations', async () => {
    await expect.poll(() => toolbarButton(page, 'undo').isDisabled()).toBe(true)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)
  })

  test('undo removes the block, then redo restores it', async () => {
    const uuid = await addBlock(page, TEXT)

    // One mutation applied: the block is rendered, undo enabled, redo disabled.
    expect(await currentMutationIndex(page)).toBe(0)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(true)
    await expect
      .poll(() => toolbarButton(page, 'undo').isDisabled())
      .toBe(false)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)

    await moveInHistory(page, () => toolbarButton(page, 'undo').click())

    // Reverted: block gone from state *and* the canvas, index back to -1,
    // undo disabled, redo enabled.
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(false)
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)
    await expect.poll(() => toolbarButton(page, 'undo').isDisabled()).toBe(true)
    await expect
      .poll(() => toolbarButton(page, 'redo').isDisabled())
      .toBe(false)

    await moveInHistory(page, () => toolbarButton(page, 'redo').click())

    // Reapplied: block back in state and re-rendered, index 0, redo disabled.
    await expect.poll(() => blockExists(page, uuid!)).toBe(true)
    await expect.poll(() => blockRendered(page, uuid!)).toBe(true)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => toolbarButton(page, 'redo').isDisabled()).toBe(true)
  })

  test('the Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z shortcuts undo and redo', async () => {
    const uuid = await addBlock(page, TEXT)

    await moveInHistory(page, () => pressShortcut(page, 'ControlOrMeta+z'))
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)

    await moveInHistory(page, () =>
      pressShortcut(page, 'ControlOrMeta+Shift+z'),
    )
    await expect.poll(() => blockExists(page, uuid!)).toBe(true)
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
  })

  test('the sidebar lists one item per mutation and marks the active one', async () => {
    await addBlock(page, TEXT)
    await addBlock(page, TEXT)

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
  })

  test('clicking an older list item reverts the document to that point', async () => {
    const first = await addBlock(page, TEXT)
    const second = await addBlock(page, TEXT)

    await openHistory(page)
    await moveInHistory(page, () => clickHistoryItem(page, 0))

    // Only the first mutation stays applied: second block gone from the canvas,
    // first still rendered.
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => blockRendered(page, second!)).toBe(false)
    expect(await blockExists(page, second!)).toBe(false)
    expect(await blockRendered(page, first!)).toBe(true)
    await expect.poll(() => activeHistoryIndex(page)).toBe(0)
  })

  test('"Current revision" reverts everything, and a later item reapplies it', async () => {
    const first = await addBlock(page, TEXT)
    const second = await addBlock(page, TEXT)

    await openHistory(page)

    // "Current revision" is the originally saved state (index -1): all changes gone.
    await moveInHistory(page, () => clickCurrentRevision(page))
    await expect.poll(() => currentMutationIndex(page)).toBe(-1)
    await expect.poll(() => blockExists(page, first!)).toBe(false)
    expect(await blockExists(page, second!)).toBe(false)
    await expect.poll(() => activeHistoryIndex(page)).toBe(-1)

    // Jumping forward to the latest mutation reapplies both blocks.
    await moveInHistory(page, () => clickHistoryItem(page, 1))
    await expect.poll(() => currentMutationIndex(page)).toBe(1)
    await expect.poll(() => blockExists(page, first!)).toBe(true)
    expect(await blockExists(page, second!)).toBe(true)
    await expect.poll(() => activeHistoryIndex(page)).toBe(1)
  })

  test('selection is restored per history index when jumping back and forth', async () => {
    const a = await addBlock(page, TEXT) // index 0
    const b = await addBlock(page, TEXT) // index 1

    // At index 1, select B — recorded as the selection for index 1.
    await selectBlock(page, b!)
    await expect.poll(() => selectedUuids(page)).toEqual([b!])

    // Undo to index 0 (B is gone), then select A there.
    await moveInHistory(page, () => undo(page))
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await selectBlock(page, a!)
    await expect.poll(() => selectedUuids(page)).toEqual([a!])

    // Redo to index 1: the selection stored for that index (B) is restored.
    await moveInHistory(page, () => toolbarButton(page, 'redo').click())
    await expect.poll(() => currentMutationIndex(page)).toBe(1)
    await expect.poll(() => selectedUuids(page)).toEqual([b!])

    // Undo to index 0 again: A is restored.
    await moveInHistory(page, () => undo(page))
    await expect.poll(() => currentMutationIndex(page)).toBe(0)
    await expect.poll(() => selectedUuids(page)).toEqual([a!])
  })

  test('the sidebar shows an empty state when there are no mutations', async () => {
    await openHistory(page)

    await page
      .locator('[data-test="history-empty"]')
      .waitFor({ state: 'visible' })
    expect(await historyItems(page).count()).toBe(0)
  })
})
