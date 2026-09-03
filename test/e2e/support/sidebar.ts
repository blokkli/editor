import type { Locator, Page } from 'playwright-core'
import { emitEvent } from './events'

/**
 * Open an editor sidebar pane by its `PluginSidebar` id (e.g. `test-cases`,
 * `analyze`). A sidebar only mounts its content while it's the active pane, so
 * anything that lives inside one — including the playground `test-cases`
 * feature that registers `window.__BLOKKLI__.test` — isn't available until its
 * sidebar is opened.
 */
export function openSidebar(page: Page, id: string): Promise<void> {
  return emitEvent(page, 'sidebar:open', id)
}

type AnalyzeStatus = 'pass' | 'incomplete' | 'inapplicable' | 'violation'

/**
 * A result row in the Analyze sidebar, selected by its exact result id (e.g.
 * `blokkli:image-alt-text:missing`) and optionally its rendered status.
 *
 * Continuous analyzers rerun ~100ms after every mutation, so wait for the row
 * with `expect.poll(() => row.count())` rather than asserting synchronously.
 */
export function analyzeResult(
  page: Page,
  id: string,
  status?: AnalyzeStatus,
): Locator {
  const statusFilter = status ? `[data-test-result-status="${status}"]` : ''
  return page.locator(
    `[data-test="analyze-result"][data-test-result-id="${id}"]${statusFilter}`,
  )
}

/**
 * All result rows of one analyzer, selected by result id prefix (e.g.
 * `blokkli:heading-structure:`) and optionally their rendered status.
 */
export function analyzeResults(
  page: Page,
  idPrefix: string,
  status?: AnalyzeStatus,
): Locator {
  const statusFilter = status ? `[data-test-result-status="${status}"]` : ''
  return page.locator(
    `[data-test="analyze-result"][data-test-result-id^="${idPrefix}"]${statusFilter}`,
  )
}

/**
 * Expand the target list of a result row.
 *
 * Targets render lazily — they only mount once the `<details>` is toggled
 * open. A row with a single target opens itself and hides its summary, so
 * only rows with several targets need this.
 */
export function expandAnalyzeNodes(row: Locator): Promise<void> {
  return row.locator('[data-test="analyze-result-nodes-summary"]').click()
}

/**
 * Open a status section of the Analyze results (`problems`, `success` or
 * `inapplicable`). Only the problems section is open by default; rows in a
 * closed section exist in the DOM but are hidden, so anything that has to be
 * clicked inside a pass row needs its section opened first.
 */
export async function openAnalyzeSection(
  page: Page,
  group: 'problems' | 'success' | 'inapplicable',
): Promise<void> {
  const section = page.locator(
    `[data-test="analyze-section"][data-test-section="${group}"]`,
  )
  const isOpen = await section.evaluate((el) => (el as HTMLDetailsElement).open)
  if (!isOpen) {
    await section.locator('[data-test="analyze-section-summary"]').click()
  }
}
