import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page, Locator } from 'playwright-core'
import { openEditor } from './support/session'
import { runDiffApproval, cancelDiff } from './support/diff'
import { openSidebar } from './support/sidebar'
import { setupEditorE2E } from './support/setup'

/**
 * Regression test for the DiffApproval keyboard-sync bug between the toolbar
 * and the canvas highlight.
 *
 * Before the fix, `currentItem` indexed into the unsorted `props.items` while
 * `<Highlight>` and the Space handler used the locally-sorted `items`. When
 * prop order differed from visual sort order, Space would toggle the highlight
 * but not the toolbar's accept toggle, and Enter would do the inverse — each
 * key wrote into a different `selected[id]` entry.
 *
 * The scenario passes items in reverse visual order (`reverseOrder: true`) so
 * the two arrays differ; without that, both indices would resolve to the same
 * item and the bug would be invisible.
 */
describe('DiffApproval keyboard sync', async () => {
  await setupEditorE2E()

  let page: Page

  /** The visually-active highlight item (the one with the thick outline). */
  function activeHighlight(): Locator {
    return page.locator(
      '[data-test="diff-approval-highlight-item"][data-test-active="true"]',
    )
  }

  function toolbar(): Locator {
    return page.locator('[data-test="diff-approval-toolbar"]')
  }

  async function readSelected(): Promise<{
    toolbar: string | null
    highlight: string | null
  }> {
    return {
      toolbar: await toolbar().getAttribute('data-test-selected'),
      highlight: await activeHighlight().getAttribute('data-test-selected'),
    }
  }

  beforeAll(async () => {
    page = await openEditor()
    // The `runDiffApproval` test-cases API only registers once its sidebar pane
    // mounts (see `playground/blokkli/features/test-cases/index.vue`).
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('Space and Enter both update the toolbar and the active highlight in sync', async () => {
    const done = runDiffApproval(page, { reverseOrder: true })
    await toolbar().waitFor()
    await activeHighlight().waitFor()

    // Initial state: all items start accepted, so both surfaces agree on `true`.
    const initial = await readSelected()
    expect(initial.toolbar).toBe('true')
    expect(initial.highlight).toBe('true')

    // Space — the bug: only the highlight flipped.
    await page.keyboard.press('Space')
    await expect
      .poll(() => toolbar().getAttribute('data-test-selected'))
      .toBe('false')
    const afterSpace = await readSelected()
    expect(afterSpace.toolbar).toBe('false')
    expect(afterSpace.highlight).toBe('false')

    // Enter — the bug: only the toolbar flipped.
    await page.keyboard.press('Enter')
    await expect
      .poll(() => toolbar().getAttribute('data-test-selected'))
      .toBe('true')
    const afterEnter = await readSelected()
    expect(afterEnter.toolbar).toBe('true')
    expect(afterEnter.highlight).toBe('true')

    await cancelDiff(page)
    await done
  })
})
