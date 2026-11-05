import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { editorPath, openEditor } from '../../support/session'
import { switchLanguage } from '../../support/translations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * The status of each translation, in the language switcher and the title.
 *
 * Drupal's content translation settings decide whether each translation has a
 * status of its own. The page "Swimming pool"
 * (content/nodes/status-per-language.yml) is published in English and not in
 * German, and has no French translation. The news "Pool reopens"
 * (content/nodes/shared-status.yml) is a type whose translations share their
 * status in E2E sandboxes (blokkli_playground_test).
 *
 * The switcher's dots carry the status in `data-test-status`, the title what
 * its tooltip speaks for in `data-test-entity-status-scope`: the tooltips'
 * texts are translated.
 */

/** The title/status button. */
function entityTitle(page: Page): Locator {
  return page.locator('[data-test="entity-title"]')
}

/** The status each language's dot shows in the switcher, null without one. */
function switcherStatus(page: Page): Promise<Record<string, string | null>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [
        ...document.querySelectorAll(
          '[data-test^="language-switcher-option-"]',
        ),
      ].map((option) => [
        option
          .getAttribute('data-test')!
          .replace('language-switcher-option-', ''),
        option
          .querySelector('[data-test="language-switcher-status"]')
          ?.getAttribute('data-test-status') ?? null,
      ]),
    ),
  )
}

/**
 * Page lifecycle: two editor pages, opened in parallel. `perLanguagePage`
 * opens the page "Swimming pool" in English and ends in German.
 * `sharedPage` opens the news "Pool reopens" in English.
 */
describe('The status of each translation', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let perLanguagePage: Page
  let sharedPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[perLanguagePage, sharedPage] = await Promise.all([
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/swimming-pool', 'status-per-language'),
      ),
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/news/pool-reopens', 'shared-status'),
      ),
    ])
  })

  afterAll(async () => {
    await Promise.all([perLanguagePage.close(), sharedPage.close()])
  })

  test('the switcher shows the status of each translation', async () => {
    await expect
      .poll(() => switcherStatus(perLanguagePage))
      .toEqual({ en: 'published', de: 'unpublished', fr: null })
  })

  test('the title speaks for the language being edited', async () => {
    const title = entityTitle(perLanguagePage)
    expect(await title.getAttribute('data-test-entity-status-scope')).toBe(
      'language',
    )
    expect(await title.getAttribute('data-test-entity-status')).toBe('success')
  })

  // Last on its page: it leaves the editor in German.
  test('the German editor shows the status of the German translation', async () => {
    await switchLanguage(perLanguagePage, 'de')

    const title = entityTitle(perLanguagePage)
    await expect
      .poll(() => title.getAttribute('data-test-entity-status'))
      .toBe('error')
    expect(await title.getAttribute('data-test-entity-status-scope')).toBe(
      'language',
    )
    expect(await switcherStatus(perLanguagePage)).toEqual({
      en: 'published',
      de: 'unpublished',
      fr: null,
    })
  })

  test('a shared status has no dots, and the title speaks for every language', async () => {
    await expect
      .poll(() => switcherStatus(sharedPage))
      .toEqual({ en: null, de: null, fr: null })

    const title = entityTitle(sharedPage)
    expect(await title.getAttribute('data-test-entity-status-scope')).toBe(
      'all-languages',
    )
    expect(await title.getAttribute('data-test-entity-status')).toBe('success')
  })
})
