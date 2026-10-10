import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import { dismissMessages } from '../../support/overlays'
import {
  analyzeResult,
  analyzeResults,
  expandAnalyzeNodes,
  openAnalyzeSection,
  openSidebar,
} from '../../support/sidebar'
import { emitEvent } from '../../support/events'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, revertAllChanges } from '../../support/session'

const PREFIX = 'blokkli:heading-structure:'

/**
 * The built-in `blokkli:heading-structure` analyzer (registered by the
 * sandbox's adapter) checks for exactly one H1, at least one H2 and no skipped
 * levels. It reports a single pass row only when all three hold.
 *
 * Runs on the page "Blank" (content/nodes/blank.yml): its header renders the
 * node's title as the only heading (an H1), so the baseline is a "missing H2"
 * violation. An editorial page: a page would show the H2 "Related topics"
 * while editing. Headings are added as real paragraphs — `title` renders an
 * H2, an empty `accordion` an H3.
 */
describe('Analyze — built-in heading structure analyzer', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  const result = (id: string, status: 'pass' | 'violation') =>
    analyzeResult(page, PREFIX + id, status)

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/blank', 'blank'),
    )
    await openSidebar(page, 'analyze')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
    await revertAllChanges(page)
  })

  test('reports the missing H2 on a page with only the H1', async () => {
    await expect.poll(() => result('no-h2', 'violation').count()).toBe(1)
    expect(await result('missing-h1', 'violation').count()).toBe(0)
    expect(await result('valid', 'pass').count()).toBe(0)
  })

  test('passes once an H2 follows the H1', async () => {
    await addBlock(page, { bundle: 'title', fieldName: 'field_paragraphs' })

    await expect.poll(() => result('valid', 'pass').count()).toBe(1)
    expect(await analyzeResults(page, PREFIX, 'violation').count()).toBe(0)
    // The pass row lists every heading: the header's H1 and the title's H2.
    // Pass rows live in the collapsed success section, and two targets mean
    // the row itself starts collapsed too.
    await openAnalyzeSection(page, 'success')
    const row = result('valid', 'pass')
    await expandAnalyzeNodes(row)
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)
  })

  test('reports a skipped heading level', async () => {
    // H1 → H3 without an H2 in between.
    await addBlock(page, { bundle: 'accordion', fieldName: 'field_paragraphs' })

    await expect
      .poll(() => result('skipped-levels', 'violation').count())
      .toBe(1)
    const row = result('skipped-levels', 'violation')
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(1)
    // Skipped levels carry an identifier, so the finding can be ignored.
    expect(
      await row.locator('[data-test="analyze-target-ignore"]').count(),
    ).toBe(1)
    expect(await result('valid', 'pass').count()).toBe(0)
  })
})
