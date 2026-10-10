import { setup } from '@nuxt/test-utils/e2e'
import { beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, openPage } from '../../support/session'

/**
 * The detail page's table of contents links only to the headings rendered in
 * the page's language, nested ones included. The page "Headings"
 * (content/nodes/headings.yml) has a title limited to German ("Visible
 * languages") at the top level and one in its columns. The sidebar's table of
 * contents gets the main field's list passed, so its top-level titles aren't
 * filtered by <BlokkliField> either.
 */
describe('Table of contents', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  async function links(page: Page): Promise<string[]> {
    await page.locator('[data-test="table-of-contents"]').waitFor()
    const labels = await page
      .locator('[data-test="table-of-contents-link"]')
      .allTextContents()
    return labels.map((label) => label.trim())
  }

  test('links the headings rendered in the language', async () => {
    const [en, de] = await Promise.all([
      openPage(sandbox, 'Anna Keller', '/en/headings'),
      openPage(sandbox, 'Anna Keller', '/de/titel'),
    ])

    expect(await links(en)).toEqual([
      'For everyone',
      'For everyone in the columns',
    ])
    expect(await links(de)).toEqual([
      'Für alle',
      'Nur auf Deutsch',
      'Für alle in den Spalten',
      'Nur auf Deutsch in den Spalten',
    ])

    await Promise.all([en.close(), de.close()])
  })

  // The editor renders the hidden headings, muted; the table of contents
  // still skips them.
  test('skips the headings hidden in the language while editing', async () => {
    const page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/headings', 'headings'),
    )

    const labels = await links(page)
    expect(labels).toContain('For everyone')
    expect(labels).toContain('For everyone in the columns')
    expect(labels).not.toContain('Only in German')
    expect(labels).not.toContain('Only in German in the columns')

    await page.close()
  })
})
