import { setup } from '@nuxt/test-utils/e2e'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import {
  analyzeResult,
  expandAnalyzeNodes,
  openAnalyzeSection,
  openSidebar,
} from '../../support/sidebar'
import { toolbarButton } from '../../support/toolbar'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import {
  CANARY_WORD,
  canaryText,
  canaryTypedHtml,
  installCanary,
  resetCanary,
  settledCanaries,
  storeFieldValue,
  storePageFieldValue,
} from '../../support/xss'

/**
 * X1 (plans/xss): text that becomes markup again. An editor who types the
 * payload as text stores text: the page shows it escaped. Read back through
 * `textContent`, it's markup, and these places rendered it with `v-html`.
 * Fixed: they show it as text.
 *
 * - search, "On this page": every block's text, through `Highlight`;
 * - the command palette: the page title in "Edit @label", through `Highlight`;
 * - analyze, heading structure: the headings' text, in node descriptions, which
 *   are HTML.
 *
 * Runs on the page "Blank" (content/nodes/blank.yml): its title is the only
 * H1. The spec gives it a title, a text and a title paragraph (an H2), each
 * with a payload of its own.
 */
describe('XSS canary: text rendered as markup (X1)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/blank', 'blank'),
    )
    await installCanary(page)
    await storePageFieldValue(page, 'title', canaryText('page-title'))
    const text = await addBlock(page, { bundle: 'text' })
    await storeFieldValue(page, text!, 'field_text', canaryTypedHtml('text'))
    const heading = await addBlock(page, { bundle: 'title' })
    await storeFieldValue(page, heading!, 'field_title', canaryText('heading'))
  })

  beforeEach(async () => {
    await resetCanary(page)
  })

  afterEach(async () => {
    // Closes the search overlay and the command palette.
    await page.keyboard.press('Escape')
  })

  afterAll(async () => {
    await page.close()
  })

  test("search lists a block's text as text", async () => {
    await toolbarButton(page, 'search').click()
    // Without a search term, the first blocks are listed.
    const results = page.locator('[data-test="search-page-result"]')
    await results.first().waitFor({ state: 'visible' })

    await expect
      .poll(() => results.allTextContents())
      .toContainEqual(expect.stringContaining(canaryText('text')))
    expect(await settledCanaries(page)).not.toContain('text')
  })

  test('the command palette shows the page title as text', async () => {
    const palette = page.locator('[data-test="command-palette"]')
    await toolbarButton(page, 'command_palette').click()
    await palette.waitFor({ state: 'visible' })
    await palette.locator('[data-test="text-input"]').fill(CANARY_WORD)
    const item = page.locator(
      '[data-test="command-palette-item"][data-test-command-id="feature:entity-title:edit-entity"]',
    )
    await item.waitFor({ state: 'visible' })

    expect(await item.textContent()).toContain(canaryText('page-title'))
    expect(await settledCanaries(page)).not.toContain('page-title')
  })

  test('analyze lists a heading as text', async () => {
    await openSidebar(page, 'analyze')
    // One H1 and one H2: the structure is correct, and its pass row lists
    // both headings.
    const row = analyzeResult(page, 'blokkli:heading-structure:valid', 'pass')
    await expect.poll(() => row.count()).toBe(1)
    await openAnalyzeSection(page, 'success')
    await expandAnalyzeNodes(row)
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(2)

    await expect
      .poll(() =>
        row.locator('[data-test="analyze-node-description"]').allTextContents(),
      )
      .toContainEqual(expect.stringContaining(canaryText('heading')))
    expect(await settledCanaries(page)).not.toContain('heading')
  })
})
