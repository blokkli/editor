import { setup, url, type NuxtPage } from '@nuxt/test-utils/e2e'
import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { openAnonymousPage } from '../../support/session'

/**
 * The test fragments: `default` has no `hydrate`, the others have theirs
 * (sandbox/frontend/app/components/Paragraph/BlokkliFragment/Hydration).
 */
type Fragment = 'default' | 'never' | 'visible' | 'idle'

const FRAGMENTS: Fragment[] = ['default', 'never', 'visible', 'idle']

/**
 * Literals that only one component's code has, its `data-test` value: a script
 * that contains one is that component's module (dev server) or its chunk
 * (build).
 */
const CODE = {
  default: 'hydration-default',
  never: 'hydration-never',
  visible: 'hydration-visible',
  idle: 'hydration-idle',
  text: 'text-paragraph',
}

/** The `visible` fragment is below it, the accordion in it. */
const VIEWPORT = { width: 1280, height: 800 }

function fragment(page: NuxtPage, name: Fragment) {
  return page.locator(`[data-test="hydration-${name}"]`)
}

async function isMounted(page: NuxtPage, name: Fragment): Promise<boolean> {
  return (
    (await fragment(page, name).getAttribute('data-test-mounted')) === 'true'
  )
}

/** Clicks the fragment's button: it counts once the fragment has hydrated. */
async function clickButton(page: NuxtPage, name: Fragment): Promise<void> {
  await page.locator(`[data-test="hydration-${name}-button"]`).click()
}

function count(page: NuxtPage, name: Fragment): Promise<string | null> {
  return page
    .locator(`[data-test="hydration-${name}-button"]`)
    .getAttribute('data-test-count')
}

/**
 * Records which of the CODE literals the scripts that the page downloads from
 * /_nuxt/ contain. Dependencies (node_modules) have none of them.
 */
function recordDownloads(page: NuxtPage) {
  const found = new Set<string>()
  const reads = new Set<Promise<void>>()
  page.on('response', (response) => {
    const responseUrl = response.url()
    if (
      !responseUrl.includes('/_nuxt/') ||
      responseUrl.includes('/node_modules/')
    ) {
      return
    }
    const read: Promise<void> = response
      .text()
      .then(
        (text) => {
          for (const literal of Object.values(CODE)) {
            if (text.includes(literal)) {
              found.add(literal)
            }
          }
        },
        // A redirect has no body.
        () => {},
      )
      .finally(() => reads.delete(read))
    reads.add(read)
  })

  return {
    /** Whether a script downloaded so far has the literal. */
    async has(literal: string): Promise<boolean> {
      await Promise.all(reads)
      return found.has(literal)
    },
  }
}

/** Vue's warnings and errors about the hydration. */
function recordHydrationMessages(page: NuxtPage): string[] {
  const messages: string[] = []
  page.on('console', (message) => {
    if (
      ['warning', 'error'].includes(message.type()) &&
      /hydrat/i.test(message.text())
    ) {
      messages.push(message.text())
    }
  })
  page.on('pageerror', (error) => {
    if (/hydrat/i.test(error.message)) {
      messages.push(error.message)
    }
  })
  return messages
}

/** The scripts that the server's HTML has links of the kind to. */
function scriptLinks(html: string, rel: 'modulepreload' | 'prefetch') {
  return [...html.matchAll(/<link\b[^>]*>/g)].flatMap(([tag]) => {
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1]
    return tag.includes(`rel="${rel}"`) && href?.endsWith('.js') ? [href] : []
  })
}

/** The CODE literals in the scripts. */
async function literalsIn(page: NuxtPage, hrefs: string[]): Promise<string[]> {
  const texts = await Promise.all(
    hrefs.map(async (href) => {
      const response = await page.request.get(new URL(href, page.url()).href)
      return response.text()
    }),
  )
  return Object.values(CODE).filter((literal) =>
    texts.some((text) => text.includes(literal)),
  )
}

/**
 * `hydrate` on a page that Nuxt renders on the server (content/nodes/
 * hydration.yml), for an anonymous visitor: the test fragments, a text
 * (`never`) and an accordion (`visible`).
 *
 * Page lifecycle: a page per test, because a page hydrates only once.
 * Anonymous pages rendered on the server are cheap.
 */
describe('Hydration', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: NuxtPage | null = null
  let messages: string[] = []

  /** Opens the path as a visitor, and waits until the page has hydrated. */
  async function open(path = '/en/hydration') {
    page = await openAnonymousPage(sandbox, {
      public: true,
      viewport: VIEWPORT,
    })
    messages = recordHydrationMessages(page)
    const downloads = recordDownloads(page)
    const response = await page.goto(url(path), { waitUntil: 'hydration' })
    expect(response?.status()).toBe(200)
    return { page, html: (await response?.text()) ?? '', downloads }
  }

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  afterEach(async () => {
    await page?.close()
    page = null
    expect(messages).toEqual([])
  })

  test('the server renders every block', async () => {
    const { html } = await open()
    for (const name of FRAGMENTS) {
      expect(html).toContain(`data-test="hydration-${name}"`)
    }
    expect(html).toContain('data-test="text-paragraph"')
    expect(html).toContain('data-test="accordion-toggle"')
  })

  test('without hydrate, a block hydrates with the page', async () => {
    const { page, downloads } = await open()
    expect(await isMounted(page, 'default')).toBe(true)
    await clickButton(page, 'default')
    await expect.poll(() => count(page, 'default')).toBe('1')
    expect(await downloads.has(CODE.default)).toBe(true)
  })

  test('never: the block never hydrates, and its code never loads', async () => {
    const { page, downloads } = await open()
    // Once the browser has been idle, the page has nothing left to do.
    await expect
      .poll(() => isMounted(page, 'idle'), { timeout: 11_000 })
      .toBe(true)
    await clickButton(page, 'never')
    expect(await count(page, 'never')).toBe('0')
    expect(await isMounted(page, 'never')).toBe(false)
    expect(await downloads.has(CODE.never)).toBe(false)
    // The search finds the code of a block that hydrated.
    expect(await downloads.has(CODE.default)).toBe(true)
  })

  test('visible: the block hydrates when it enters the viewport', async () => {
    const { page } = await open()
    const top = await fragment(page, 'visible').evaluate(
      (element) => element.getBoundingClientRect().top,
    )
    expect(top).toBeGreaterThan(VIEWPORT.height)
    expect(await isMounted(page, 'visible')).toBe(false)
    await fragment(page, 'visible').scrollIntoViewIfNeeded()
    await expect.poll(() => isMounted(page, 'visible')).toBe(true)
    await clickButton(page, 'visible')
    await expect.poll(() => count(page, 'visible')).toBe('1')
  })

  test('idle: the block hydrates when the browser is idle', async () => {
    const { page } = await open()
    // Vue gives the browser 10 seconds to be idle.
    await expect
      .poll(() => isMounted(page, 'idle'), { timeout: 11_000 })
      .toBe(true)
    await clickButton(page, 'idle')
    await expect.poll(() => count(page, 'idle')).toBe('1')
  })

  test('the paragraphs follow their definitions: the accordion and the text', async () => {
    const { page, downloads } = await open()
    const toggle = page.locator('[data-test="accordion-toggle"]')
    // In the first viewport, a `visible` block hydrates with the page.
    const bottom = await toggle.evaluate(
      (element) => element.getBoundingClientRect().bottom,
    )
    expect(bottom).toBeLessThan(VIEWPORT.height)
    await toggle.click()
    await expect.poll(() => toggle.getAttribute('aria-expanded')).toBe('true')
    // The text is `never`, the one in the accordion too.
    expect(await downloads.has(CODE.text)).toBe(false)
  })

  test("the blocks' code isn't in the page's resource hints", async () => {
    const { page, html } = await open()
    const modulepreload = scriptLinks(html, 'modulepreload')
    // At least the app's entry.
    expect(modulepreload.length).toBeGreaterThan(0)
    const preloaded = await literalsIn(page, modulepreload)
    for (const literal of [CODE.never, CODE.visible, CODE.idle, CODE.text]) {
      expect(preloaded).not.toContain(literal)
    }
    // Only `never` is left out of the prefetch links too.
    const prefetched = await literalsIn(page, scriptLinks(html, 'prefetch'))
    for (const literal of [CODE.never, CODE.text]) {
      expect(prefetched).not.toContain(literal)
    }
  })

  test('after a navigation in the browser, every block renders', async () => {
    const { page } = await open('/en/blank')
    await page.evaluate(() =>
      window.useNuxtApp!().$router.push('/en/hydration'),
    )
    for (const name of FRAGMENTS) {
      await expect.poll(() => isMounted(page, name)).toBe(true)
      await clickButton(page, name)
      await expect.poll(() => count(page, name)).toBe('1')
    }
  })
})
