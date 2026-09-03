import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from './../../support/blocks'
import { dismissMessages } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import { openEditor, resetMockState, withApp } from './../../support/session'
import {
  analyzeResults,
  expandAnalyzeNodes,
  openSidebar,
} from './../../support/sidebar'
import { emitEvent } from './../../support/events'

/**
 * The built-in `blokkli:validations` analyzer surfaces `state.violations`
 * inside the Analyze sidebar. It's registered by the analyze provider
 * regardless of adapter opt-in. Violations are intentionally NOT ignorable
 * (no `identifier` on the nodes); an empty `state.violations` produces a
 * status-only `pass` row.
 */
describe('Analyze — built-in validations analyzer', async () => {
  await setupEditorE2E()

  let page: Page

  const validationsResult = (status?: 'pass' | 'violation') =>
    analyzeResults(page, 'blokkli:validations:', status)

  /**
   * Wait for the continuous-analyzer pass to settle after a mutation. Main.vue
   * debounces the rerun by 100ms and the analyzer itself is sync, so a short
   * poll on the rendered status is enough.
   */
  async function waitForValidationsStatus(
    status: 'pass' | 'violation',
  ): Promise<void> {
    await expect.poll(() => validationsResult(status).count()).toBe(1)
  }

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'analyze')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
    await resetMockState(page)
  })

  test('renders a pass row when there are no violations', async () => {
    await waitForValidationsStatus('pass')

    const row = validationsResult('pass')
    expect(await row.getAttribute('data-test-result-id')).toBe(
      'blokkli:validations:pass',
    )
    // The pass row carries no targets — it's a status-only message.
    expect(await row.locator('[data-test="analyze-target"]').count()).toBe(0)
  })

  // The validations row has two targets (header + blocks), so it starts
  // collapsed and must be expanded before asserting on the target list.
  test('surfaces violations from an empty grid as a violation row', async () => {
    // An empty `grid` paragraph reports two violations (header + blocks).
    await addBlock(page, { bundle: 'grid' })

    await waitForValidationsStatus('violation')

    const row = validationsResult('violation')
    expect(await row.getAttribute('data-test-result-id')).toBe(
      'blokkli:validations:failed',
    )
    await expandAnalyzeNodes(row)
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)
  })

  test('violation targets do not show the ignore button', async () => {
    await addBlock(page, { bundle: 'grid' })
    await waitForValidationsStatus('violation')

    const row = validationsResult('violation')
    await expandAnalyzeNodes(row)
    // Wait for the lazily-rendered targets to mount before asserting absence
    // of the ignore button — otherwise the count is trivially 0.
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)

    // No `identifier` on the violation nodes → ignore UI gated by
    // `v-if="node.identifier"` in ResultsItemNodesTarget never renders.
    expect(
      await row.locator('[data-test="analyze-target-ignore"]').count(),
    ).toBe(0)
  })

  test('clicking a violation target selects the offending block', async () => {
    const gridUuid = await addBlock(page, { bundle: 'grid' })
    expect(gridUuid).toBeTruthy()

    await waitForValidationsStatus('violation')

    const row = validationsResult('violation')
    await expandAnalyzeNodes(row)
    await row.locator('[data-test="analyze-target-button"]').first().click()

    await expect
      .poll(() => withApp(page, (app) => app.selection.uuids.value))
      .toContain(gridUuid)
  })
})
