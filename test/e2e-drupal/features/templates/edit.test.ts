import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  BLOCKS_EDITOR_PATH,
  getHostContext,
  openEditor,
} from '../../support/session'

// The template "Two texts on the left" (content/templates.yml).
const TEMPLATE = seedUuid('blokkli_paragraph_template', 'two-texts-left')

/** A template's page: its canonical URL, by its ID. */
const TEMPLATE_PATH = /^\/en\/blokkli\/template\/(\d+)$/

/**
 * A template is edited on its page, Drupal's canonical URL of the template:
 * the editor links there with the ID, as Drupal does.
 *
 * Page lifecycle: Anna opens the page "Blocks" in the editor; the second test
 * opens a page of its own. Nothing is changed.
 */
describe('Editing a template', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  test("The editor links to the template's page", async () => {
    // The URL of the edit button in the dialog "Manage templates".
    const url = await page.evaluate(async (uuid) => {
      const { adapter } = window.__BLOKKLI__!.app!
      const results = await adapter.templatesSearch!({
        page: 0,
        filters: {},
        includeItems: false,
      })
      const template = results.items.find((v) => v.uuid === uuid)!
      return adapter.templatesGetEditUrl!({
        templateUuid: template.uuid,
        templateId: template.id ?? null,
      })
    }, TEMPLATE)
    const parsed = new URL(url!, 'https://x')
    expect(parsed.pathname).toMatch(TEMPLATE_PATH)
    expect(parsed.searchParams.get('blokkliEditing')).toBe(TEMPLATE)
  })

  test("Drupal's link opens the template's page in the editor", async () => {
    // Drupal's "open editing" redirects to the template's canonical URL.
    const drupalPage = await openEditor(
      sandbox,
      'Anna Keller',
      `/en/paragraphs_blokkli/open/blokkli_paragraph_template/${TEMPLATE}`,
    )
    try {
      expect(new URL(drupalPage.url()).pathname).toMatch(TEMPLATE_PATH)
      expect((await getHostContext(drupalPage)).uuid).toBe(TEMPLATE)
    } finally {
      await drupalPage.close()
    }
  })
})
