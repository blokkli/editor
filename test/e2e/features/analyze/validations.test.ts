import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from './../../support/blocks'
import { dismissMessages } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import { openEditor, withApp } from './../../support/session'
import { openSidebar } from './../../support/sidebar'
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

  const validationsResult = (status?: 'pass' | 'violation') => {
    const statusFilter = status ? `[data-test-result-status="${status}"]` : ''
    return page.locator(
      `[data-test="analyze-result"][data-test-result-id^="blokkli:validations:"]${statusFilter}`,
    )
  }

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

  /**
   * Reset between tests: clear EditState mutations from localStorage and reload
   * state so the next test starts with no pending changes. See
   * `history/base.test.ts` for the shared pattern.
   */
  async function resetEditor(): Promise<void> {
    await page.evaluate(() => {
      localStorage.removeItem('__30_blokkli_mock_1_mutations')
      localStorage.removeItem('__30_blokkli_mock_1_index')
    })
    await emitEvent(page, 'reloadState')
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.mutations.value.length === 0,
    )
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
    await resetEditor()
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

  /**
   * The analyzer's result panel renders its target buttons lazily — they only
   * mount once the `<details>` is toggled open. The validations row has two
   * targets (header + blocks), so it starts collapsed; click the summary to
   * expand it before asserting on the target list.
   */
  async function expandNodes(
    row: ReturnType<typeof validationsResult>,
  ): Promise<void> {
    await row.locator('[data-test="analyze-result-nodes-summary"]').click()
  }

  test('surfaces violations from an empty grid as a violation row', async () => {
    // An empty `grid` paragraph reports two violations (header + blocks).
    await addBlock(page, { bundle: 'grid' })

    await waitForValidationsStatus('violation')

    const row = validationsResult('violation')
    expect(await row.getAttribute('data-test-result-id')).toBe(
      'blokkli:validations:failed',
    )
    await expandNodes(row)
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)
  })

  test('violation targets do not show the ignore button', async () => {
    await addBlock(page, { bundle: 'grid' })
    await waitForValidationsStatus('violation')

    const row = validationsResult('violation')
    await expandNodes(row)
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
    await expandNodes(row)
    await row.locator('[data-test="analyze-target-button"]').first().click()

    await expect
      .poll(() => withApp(page, (app) => app.selection.uuids.value))
      .toContain(gridUuid)
  })
})
