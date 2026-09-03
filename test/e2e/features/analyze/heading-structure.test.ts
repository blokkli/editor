import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from './../../support/blocks'
import { dismissMessages } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import {
  EDITOR_PATH_EMPTY,
  openEditor,
  resetMockState,
} from './../../support/session'
import {
  analyzeResult,
  analyzeResults,
  expandAnalyzeNodes,
  openAnalyzeSection,
  openSidebar,
} from './../../support/sidebar'
import { emitEvent } from './../../support/events'

const PREFIX = 'blokkli:heading-structure:'

/**
 * The built-in `blokkli:heading-structure` analyzer (registered by the
 * playground adapter) checks for exactly one H1, at least one H2 and no
 * skipped levels. It reports a single pass row only when all three hold.
 *
 * Runs on the empty page: its Hero renders the entity title as the only
 * heading (an H1), so the baseline is a "missing H2" violation. Headings are
 * added as real blocks — `title` renders an H2, `card_plain` an H3.
 */
describe('Analyze — built-in heading structure analyzer', async () => {
  await setupEditorE2E()

  let page: Page

  const result = (id: string, status: 'pass' | 'violation') =>
    analyzeResult(page, PREFIX + id, status)

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY)
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

  test('reports the missing H2 on a page with only the H1', async () => {
    await expect.poll(() => result('no-h2', 'violation').count()).toBe(1)
    expect(await result('missing-h1', 'violation').count()).toBe(0)
    expect(await result('valid', 'pass').count()).toBe(0)
  })

  test('passes once an H2 follows the H1', async () => {
    await addBlock(page, { bundle: 'title' })

    await expect.poll(() => result('valid', 'pass').count()).toBe(1)
    expect(await analyzeResults(page, PREFIX, 'violation').count()).toBe(0)
    // The pass row lists every heading: the Hero H1 and the title block H2.
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
    await addBlock(page, { bundle: 'card_plain' })

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
