import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from './../../support/blocks'
import { dismissMessages } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import { openEditor, withApp } from './../../support/session'
import { openSidebar } from './../../support/sidebar'
import { emitEvent } from './../../support/events'

/**
 * Highlight → analyze sidebar focus.
 *
 * When the user clicks a highlight tooltip button on the canvas, the editor
 * (1) opens the analyze sidebar, (2) expands the result that owns the
 * highlight, and (3) scrolls the corresponding target row into view. We
 * exercise that chain through the highlight's own `onClick` — the same call
 * the tooltip button issues — and assert the target lands inside the viewport.
 *
 * Two race conditions made this unreliable: `ResultsItemNodes` used a
 * non-immediate watcher on `activeHighlightId` (missed the value when the
 * panel mounted after the click), and `ResultsItemNodesTarget`'s
 * `scrollIntoView` watcher used `{ immediate: true }` which ran in setup
 * before the template ref was populated. The first case is covered by the
 * "expanded" test (mounts a fresh target on click); the second by the
 * "cold load" test (panel AND target both mount post-click).
 */
describe('Analyze — highlight click focuses the target row', async () => {
  await setupEditorE2E()

  let page: Page

  /**
   * Wait for a `blokkli:validations:failed_____<n>` highlight to land in the
   * plugin registry. Continuous analyzers debounce 100ms, so we poll briefly.
   */
  async function waitForValidationsHighlightId(): Promise<string> {
    const id = await withApp(page, async (app) => {
      for (let i = 0; i < 50; i++) {
        const items = app.plugins.get('highlight')
        const match = items.find((h) =>
          h.id?.startsWith('blokkli:validations:failed_____'),
        )
        if (match?.id) return match.id
        await new Promise((r) => setTimeout(r, 50))
      }
      return null
    })
    if (!id) throw new Error('No validations highlight registered.')
    return id
  }

  /**
   * Invoke the registered highlight's `onClick` — same code path the tooltip
   * button calls. Skips driving canvas hover (the tooltip only mounts under
   * the cursor, and canvas-coordinate clicks are brittle).
   */
  async function clickHighlight(highlightId: string): Promise<void> {
    await page.evaluate((id) => {
      const app = window.__BLOKKLI__!.app!
      app.plugins
        .get('highlight')
        .find((h) => h.id === id)
        ?.onClick()
    }, highlightId)
  }

  /**
   * Reset between tests: clear EditState mutations + collapse the analyze
   * sidebar so each test starts from a known state.
   */
  async function resetEditor(): Promise<void> {
    await page.evaluate(() => {
      localStorage.removeItem('__30_blokkli_mock_1_mutations')
      localStorage.removeItem('__30_blokkli_mock_1_index')
      // Clear the active-sidebar storage so the next test can choose its own
      // starting state. The `PluginSidebar` reads this at storage-sync time;
      // an explicit `sidebar:open` from the test still wins.
      localStorage.removeItem('blokkli:sidebar:active:right')
    })
    await emitEvent(page, 'reloadState')
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.mutations.value.length === 0,
    )
  }

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
    // Reset the active highlight id so the next test's `highlight.onClick`
    // toggles to a known value, not from a previous test's id.
    await withApp(page, (app) => {
      app.ui.activeHighlightId.value = ''
    })
    await resetEditor()
  })

  test('scrolls target into view when the result panel is already expanded', async () => {
    // The working path today: sidebar open + result panel expanded before the
    // highlight click. The target is mounted, so the click drives a true
    // `isFocused` transition and `scrollIntoView` fires against the live
    // button.
    await openSidebar(page, 'analyze')
    await addBlock(page, { bundle: 'grid' })

    const target = page.locator(
      '[data-test="analyze-result"][data-test-result-id="blokkli:validations:failed"] [data-test="analyze-target-button"]',
    )

    // Wait for the validations result, then click the summary to expand it
    // (mounts the target buttons).
    const row = page.locator(
      '[data-test="analyze-result"][data-test-result-id="blokkli:validations:failed"]',
    )
    await row.waitFor({ state: 'visible' })
    await row.locator('[data-test="analyze-result-nodes-summary"]').click()
    await target.first().waitFor({ state: 'visible' })

    const highlightId = await waitForValidationsHighlightId()
    await clickHighlight(highlightId)

    // "Scrolled into view" = the focused button's bounding box sits inside
    // the page viewport.
    await expect
      .poll(async () => {
        const box = await target.first().boundingBox()
        const viewport = page.viewportSize()
        if (!box || !viewport) return false
        return box.y >= 0 && box.y + box.height <= viewport.height
      })
      .toBe(true)
  })

  // Cold-load regression: a truly fresh editor with the analyze sidebar
  // never opened. Both the result panel and the target row mount post-click.
  // Uses a dedicated fresh page — the shared `page` from `beforeAll` carries
  // component state across tests (analyze `render-always` keeps the slot
  // mounted once it flipped to `shouldRender`), so the cold-load race only
  // reproduces against a brand new editor instance.
  test('clears the active highlight when the analyze sidebar is closed', async () => {
    await openSidebar(page, 'analyze')
    await addBlock(page, { bundle: 'grid' })

    const highlightId = await waitForValidationsHighlightId()
    await clickHighlight(highlightId)

    // Sanity: the click set the active highlight id.
    await expect
      .poll(() => withApp(page, (app) => app.ui.activeHighlightId.value))
      .toBe(highlightId)

    // Close the analyze sidebar via its header close button. The
    // `data-test="sidebar-title-analyze"` scope ensures we target the analyze
    // pane's close button specifically (multiple `PluginSidebar` instances
    // exist in the DOM).
    await page
      .locator(
        '[data-test="sidebar-title-analyze"] [data-test="sidebar-close"]',
      )
      .click()

    // Closing the sidebar should release the active highlight — otherwise the
    // bold border lingers on the canvas (when `keepVisible` is on) and the
    // next sidebar open auto-expands a stale result.
    await expect
      .poll(() => withApp(page, (app) => app.ui.activeHighlightId.value))
      .toBe('')
  })

  test('opens result and scrolls target into view from a cold load', async () => {
    const freshPage = await openEditor()
    try {
      await addBlock(freshPage, { bundle: 'grid' })

      // Use a local helper bound to the fresh page rather than the shared
      // one — the closures above all reference the shared `page`.
      const highlightId = await withApp(freshPage, async (app) => {
        for (let i = 0; i < 50; i++) {
          const items = app.plugins.get('highlight')
          const match = items.find((h) =>
            h.id?.startsWith('blokkli:validations:failed_____'),
          )
          if (match?.id) return match.id
          await new Promise((r) => setTimeout(r, 50))
        }
        return null
      })
      if (!highlightId) throw new Error('No validations highlight registered.')

      await freshPage.evaluate((id) => {
        const app = window.__BLOKKLI__!.app!
        app.plugins
          .get('highlight')
          .find((h) => h.id === id)
          ?.onClick()
      }, highlightId)

      const target = freshPage.locator(
        '[data-test="analyze-result"][data-test-result-id="blokkli:validations:failed"] [data-test="analyze-target-button"]',
      )
      await target.first().waitFor({ state: 'visible', timeout: 3000 })

      await expect
        .poll(
          async () => {
            const box = await target.first().boundingBox()
            const viewport = freshPage.viewportSize()
            if (!box || !viewport) return false
            return box.y >= 0 && box.y + box.height <= viewport.height
          },
          { timeout: 3000 },
        )
        .toBe(true)
    } finally {
      await freshPage.close()
    }
  })
})
