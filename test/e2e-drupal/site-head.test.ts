import { setup, url } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'
import { openPage } from './support/session'

/** The page's title and description. */
function readHead(page: Page) {
  return page.evaluate(() => ({
    title: document.title,
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') ?? null,
  }))
}

/**
 * The head of the site's pages: a page's title is its own and the site's name
 * (the site's config page, content/config_pages.yml), its description its
 * lead. The front page's title is the site's name. The favicon is the coat of
 * arms.
 *
 * Page lifecycle: Anna, outside the editor; each test opens its path.
 */
describe("The head of the site's pages", async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openPage(sandbox, 'Anna Keller', '/en/reading')
  })

  afterAll(async () => {
    await page.close()
  })

  test('a page has its title, the site name and its lead', async () => {
    await expect
      .poll(() => readHead(page))
      .toEqual({
        title: 'Reading – Blockingen',
        description: 'The lead of the page.',
      })
  })

  test('the front page has the site name', async () => {
    await page.goto(url('/en'))
    await expect
      .poll(() => readHead(page))
      .toEqual({
        title: 'Blockingen',
        description: null,
      })
  })

  test('an error page has its heading as title', async () => {
    await page.goto(url('/en/no-such-page'))
    const heading = page.locator('[data-test="error-title"]')
    await heading.waitFor({ state: 'visible' })
    const text = (await heading.textContent())?.trim()
    expect(text).toBeTruthy()
    await expect.poll(() => page.title()).toBe(text)
  })

  test('the favicon is an icon', async () => {
    // An ICO file starts with 0, 0, 1, 0. Without one, Nuxt answers
    // /favicon.ico with a placeholder text.
    const answer = await page.evaluate(async () => {
      const response = await fetch('/favicon.ico')
      const bytes = new Uint8Array(await response.arrayBuffer())
      return [response.status, ...bytes.slice(0, 4)]
    })
    expect(answer).toEqual([200, 0, 0, 1, 0])
  })
})
