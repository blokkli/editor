import type { Locator, Page } from 'playwright-core'
import { withApp } from './session'
import { openSidebar } from './sidebar'

// Drive and read the history feature (`features/history`): the undo/redo state
// lives on `app.state`, and the sidebar `List` exposes its items via
// `data-test="history-*"` seams.

/** Open the history sidebar pane (the `List` only mounts while it's active). */
export function openHistory(page: Page): Promise<void> {
  return openSidebar(page, 'history')
}

/** All mutation list items in the history sidebar (excludes "Current revision"). */
export function historyItems(page: Page): Locator {
  return page.locator('[data-test="history-item"]')
}

/** A single mutation list item by its history index. */
export function historyItem(page: Page, index: number): Locator {
  return page.locator(
    `[data-test="history-item"][data-test-history-index="${index}"]`,
  )
}

/** Jump to a mutation by clicking its list item (calls `setHistoryIndex`). */
export function clickHistoryItem(page: Page, index: number): Promise<void> {
  return historyItem(page, index)
    .locator('[data-test="history-item-button"]')
    .click()
}

/** Jump to the head of history by clicking the "Current revision" item. */
export function clickCurrentRevision(page: Page): Promise<void> {
  return page
    .locator(
      '[data-test="history-current-revision"] [data-test="history-item-button"]',
    )
    .click()
}

/** The current position in the mutation history (`-1` when no mutation is applied). */
export function currentMutationIndex(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.currentMutationIndex.value)
}

/** The number of mutations recorded so far. */
export function mutationCount(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.mutations.value.length)
}

/**
 * The index marked active in the sidebar DOM, read from the `<li>` carrying
 * `data-test-history-active="true"`. Returns `-1` when the "Current revision"
 * item is the active one (it has no index), or `null` when nothing is marked
 * (e.g. the sidebar isn't open). Asserts the DOM marker independently of state.
 */
export async function activeHistoryIndex(page: Page): Promise<number | null> {
  const active = page.locator('[data-test-history-active="true"]')
  if ((await active.count()) === 0) {
    return null
  }
  const index = await active.first().getAttribute('data-test-history-index')
  return index === null ? -1 : Number.parseInt(index, 10)
}
