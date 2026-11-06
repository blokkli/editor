import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import de from 'axe-core/locales/de.json'
import { analyzeResult, openSidebar } from '../../support/sidebar'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** The heading of axe's German summary when none of the checks passed. */
const HEADING = de.failureSummaries.any.failureMessage.split('{{')[0]!

/**
 * axe in German, under the frontend's Content-Security-Policy. axe compiled
 * the locale's failure summaries with `new Function`, which the policy blocks,
 * and the analysis failed (src/runtime/editor/features/analyze/analyzers/axe.ts).
 * The CSP check (../../setup.ts) fails the test on that violation too.
 *
 * On the German translation of content/nodes/translated.yml: axe gets the
 * page's language.
 */
describe('Analyze — axe in German', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/bibliothek', 'translated'),
    )
    await openSidebar(page, 'analyze')
  })

  afterAll(async () => {
    await page.close()
  })

  test('reports a violation with its German summary', async () => {
    // A button without a name, outside the editor's UI.
    await page.evaluate(() => {
      document.body.append(document.createElement('button'))
    })
    await page.locator('[data-test="analyze-run"]').click()

    const row = analyzeResult(page, 'button-name', 'violation')
    await expect.poll(() => row.count(), { timeout: 10000 }).toBe(1)
    await expect
      .poll(() =>
        row.locator('[data-test="analyze-node-description"]').textContent(),
      )
      .toContain(HEADING)
  })
})
