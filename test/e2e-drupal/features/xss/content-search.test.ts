import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { toolbarButton } from '../../support/toolbar'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import {
  CANARY_WORD,
  canaryText,
  installCanary,
  publishChanges,
  resetCanary,
  settledCanaries,
  storePageFieldValue,
} from '../../support/xss'

/**
 * X8 (plans/xss): the content search returns a node's label as Drupal stores
 * it (`EntityQuery`, the provider "Content"). The editor rendered its results
 * with `v-html`, so a node whose title has the payload as text ran it for
 * whoever's search found the node. Fixed in the editor (X1): it shows them as
 * text.
 *
 * The search queries the stored nodes, not the edit state: the spec publishes
 * the title of the page "Blank" (content/nodes/blank.yml) first.
 */
describe('XSS canary: content search results (X8)', async () => {
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
    await publishChanges(page)
  })

  afterAll(async () => {
    await page.close()
  })

  test("a result shows the node's title as text", async () => {
    await resetCanary(page)
    await toolbarButton(page, 'search').click()
    await page.locator('[data-test="search-input"]').fill(CANARY_WORD)
    await page
      .locator('[data-test="search-tab"][data-test-search-tab="content"]')
      .click()
    const results = page.locator('[data-test="search-content-result"]')
    await results.first().waitFor({ state: 'visible' })

    await expect
      .poll(() => results.allTextContents())
      .toContainEqual(expect.stringContaining(canaryText('page-title')))
    expect(await settledCanaries(page)).not.toContain('page-title')
  })
})
