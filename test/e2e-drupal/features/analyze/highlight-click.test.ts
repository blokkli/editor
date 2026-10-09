import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { dismissMessages } from '../../../e2e/support/overlays'
import { withApp } from '../../../e2e/support/session'
import { openSidebar } from '../../../e2e/support/sidebar'
import { emitEvent } from '../../../e2e/support/events'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** The page "Faulty" (content/nodes/faulty.yml): two stored violations. */
const FAULTY_PATH = editorPath('/en/faulty', 'faulty')

const VALIDATIONS_ROW =
  '[data-test="analyze-result"][data-test-result-id="blokkli:validations:failed"]'

/**
 * Wait for a `blokkli:validations:failed_____<n>` highlight to land in the
 * plugin registry. Continuous analyzers debounce 100ms, so we poll briefly.
 */
async function waitForValidationsHighlightId(page: Page): Promise<string> {
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
async function clickHighlight(page: Page, highlightId: string): Promise<void> {
  await page.evaluate((id) => {
    const app = window.__BLOKKLI__!.app!
    app.plugins
      .get('highlight')
      .find((h) => h.id === id)
      ?.onClick()
  }, highlightId)
}

/** Whether the element's bounding box sits inside the page's viewport. */
async function isInViewport(page: Page, locator: Locator): Promise<boolean> {
  const box = await locator.boundingBox()
  const viewport = page.viewportSize()
  if (!box || !viewport) return false
  return box.y >= 0 && box.y + box.height <= viewport.height
}

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
 *
 * The highlights come from the stored violations of the page "Faulty".
 */
describe('Analyze — highlight click focuses the target row', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', FAULTY_PATH)
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
  })

  test('scrolls target into view when the result panel is already expanded', async () => {
    // The working path today: sidebar open + result panel expanded before the
    // highlight click. The target is mounted, so the click drives a true
    // `isFocused` transition and `scrollIntoView` fires against the live
    // button.
    await openSidebar(page, 'analyze')

    const row = page.locator(VALIDATIONS_ROW)
    const target = row.locator('[data-test="analyze-target-button"]')

    // Wait for the validations result, then click the summary to expand it
    // (mounts the target buttons).
    await row.waitFor({ state: 'visible' })
    await row.locator('[data-test="analyze-result-nodes-summary"]').click()
    await target.first().waitFor({ state: 'visible' })

    const highlightId = await waitForValidationsHighlightId(page)
    await clickHighlight(page, highlightId)

    // "Scrolled into view" = the focused button's bounding box sits inside
    // the page viewport.
    await expect.poll(() => isInViewport(page, target.first())).toBe(true)
  })

  test('clears the active highlight when the analyze sidebar is closed', async () => {
    await openSidebar(page, 'analyze')

    const highlightId = await waitForValidationsHighlightId(page)
    await clickHighlight(page, highlightId)

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

  // Cold-load regression: a truly fresh editor with the analyze sidebar
  // never opened. Both the result panel and the target row mount post-click.
  // Uses a dedicated fresh page — the shared `page` from `beforeAll` carries
  // component state across tests (analyze `render-always` keeps the slot
  // mounted once it flipped to `shouldRender`), so the cold-load race only
  // reproduces against a brand new editor instance.
  test('opens result and scrolls target into view from a cold load', async () => {
    const freshPage = await openEditor(sandbox, 'Anna Keller', FAULTY_PATH)
    try {
      const highlightId = await waitForValidationsHighlightId(freshPage)
      await clickHighlight(freshPage, highlightId)

      const target = freshPage.locator(
        `${VALIDATIONS_ROW} [data-test="analyze-target-button"]`,
      )
      await target.first().waitFor({ state: 'visible', timeout: 3000 })

      await expect
        .poll(() => isInViewport(freshPage, target.first()), {
          timeout: 3000,
        })
        .toBe(true)
    } finally {
      await freshPage.close()
    }
  })
})
