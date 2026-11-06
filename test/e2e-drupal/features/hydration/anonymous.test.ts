import { setup, url, type NuxtPage } from '@nuxt/test-utils/e2e'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import {
  openAnonymousPage,
  type OpenAnonymousPageOptions,
} from '../../support/session'

const PATH = '/en/hydration'

/**
 * Anonymous visitors of an E2E sandbox. The sandbox is private, unless the
 * request has the cookie blokkli_e2e_public=1 (settings.php): then Nuxt renders
 * its pages on the server, which the hydration specs (base.test.ts) need.
 *
 * Page lifecycle: an anonymous page per test, each in a browser context of its
 * own.
 */
describe('Anonymous visitors of an E2E sandbox', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  const pages: NuxtPage[] = []

  async function open(opts: OpenAnonymousPageOptions = {}): Promise<NuxtPage> {
    const page = await openAnonymousPage(sandbox, opts)
    pages.push(page)
    return page
  }

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  afterEach(async () => {
    await Promise.all(pages.splice(0).map((page) => page.close()))
  })

  test('get the private page without the cookie', async () => {
    const page = await open()
    const response = await page.goto(url(PATH))
    expect(response?.status()).toBe(403)
    await page.locator('[data-test="error-title"]').waitFor()
  })

  test('get the page from the server with the cookie', async () => {
    const page = await open({ public: true })
    const response = await page.goto(url(PATH))
    expect(response?.status()).toBe(200)
    expect(await response?.text()).toContain('data-test="hydration-default"')
  })

  test('never get the answer to a request with the cookie without it, or the reverse', async () => {
    // Drupal caches pages by URL, GraphQL results by their cache contexts.
    const statuses: number[] = []
    for (const isPublic of [true, false, true, false]) {
      const page = await open({ public: isPublic })
      const response = await page.request.get(url(PATH))
      statuses.push(response.status())
    }
    expect(statuses).toEqual([200, 403, 200, 403])
  })
})
