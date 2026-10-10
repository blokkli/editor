import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { dismissMessages } from '../../support/overlays'
import {
  withApp,
  BLOCKS_EDITOR_PATH,
  editorPath,
  openEditor,
} from '../../support/session'
import {
  analyzeResults,
  expandAnalyzeNodes,
  openSidebar,
} from '../../support/sidebar'
import { emitEvent } from '../../support/events'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/** The gallery of the page "Faulty", which holds a title and a text. */
const GALLERY = seedUuid('paragraph', 'faulty-gallery')

/**
 * The built-in `blokkli:validations` analyzer surfaces `state.violations`
 * inside the Analyze sidebar. It's registered by the analyze provider
 * regardless of adapter opt-in. Violations are intentionally NOT ignorable
 * (no `identifier` on the nodes); an empty `state.violations` produces a
 * status-only `pass` row.
 *
 * Drupal reports what it can't store, so the violations are seeded: the page
 * "Faulty" (content/nodes/faulty.yml) has a gallery with a title and a text,
 * which a gallery doesn't allow (two violations). The page "Blocks" has none.
 */
describe('Analyze — built-in validations analyzer', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let validPage: Page
  let faultyPage: Page

  const validationsResult = (page: Page, status?: 'pass' | 'violation') =>
    analyzeResults(page, 'blokkli:validations:', status)

  /**
   * Wait for the continuous-analyzer pass to settle. Main.vue debounces the
   * rerun by 100ms and the analyzer itself is sync, so a short poll on the
   * rendered status is enough.
   */
  async function waitForValidationsStatus(
    page: Page,
    status: 'pass' | 'violation',
  ): Promise<void> {
    await expect.poll(() => validationsResult(page, status).count()).toBe(1)
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[validPage, faultyPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/faulty', 'faulty')),
    ])
    await Promise.all([
      openSidebar(validPage, 'analyze'),
      openSidebar(faultyPage, 'analyze'),
    ])
  })

  afterAll(async () => {
    await Promise.all([validPage.close(), faultyPage.close()])
  })

  afterEach(async () => {
    await emitEvent(faultyPage, 'select:unselect')
    await dismissMessages(faultyPage)
  })

  test('renders a pass row when there are no violations', async () => {
    await waitForValidationsStatus(validPage, 'pass')

    const row = validationsResult(validPage, 'pass')
    expect(await row.getAttribute('data-test-result-id')).toBe(
      'blokkli:validations:pass',
    )
    // The pass row carries no targets — it's a status-only message.
    expect(await row.locator('[data-test="analyze-target"]').count()).toBe(0)
  })

  // The validations row has two targets, so it starts collapsed and must be
  // expanded before asserting on the target list.
  test('surfaces stored violations as a violation row', async () => {
    await waitForValidationsStatus(faultyPage, 'violation')

    const row = validationsResult(faultyPage, 'violation')
    expect(await row.getAttribute('data-test-result-id')).toBe(
      'blokkli:validations:failed',
    )
    await expandAnalyzeNodes(row)
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)
  })

  test('violation targets do not show the ignore button', async () => {
    await waitForValidationsStatus(faultyPage, 'violation')

    const row = validationsResult(faultyPage, 'violation')
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
    await waitForValidationsStatus(faultyPage, 'violation')

    const row = validationsResult(faultyPage, 'violation')
    await expandAnalyzeNodes(row)
    await row.locator('[data-test="analyze-target-button"]').first().click()

    await expect
      .poll(() => withApp(faultyPage, (app) => app.selection.uuids.value))
      .toContain(GALLERY)
  })
})
