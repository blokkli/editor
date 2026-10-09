import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { waitForEditorReady, withApp } from '../../../e2e/support/session'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

/** The text of the page "Waste collection", whose German is outdated. */
const OUTDATED_TEXT = seedUuid('paragraph', 'waste-collection-text')

/**
 * Tests for the LanguageSwitcher (toolbar) and the translations Banner.
 *
 * These flows route through the `changeLanguage` and `markTranslationUpToDate`
 * adapter methods, plus the Banner's UI signals (outdated count, dialog
 * triggers). They aren't as deep as the import/export flows, but they ARE the
 * primary entry points into the rest of the translations feature — if they
 * silently break, no other flow becomes reachable from the UI.
 */
/**
 * Page lifecycle: two editor pages, opened in parallel. `switcherPage` opens
 * the page "Library" (content/nodes/translated.yml) in English and ends in
 * German. `outdatedPage` opens the German translation of the page "Waste
 * collection" (content/nodes/waste-collection.yml), which the seed flags as
 * outdated (`outdated: [de]`), with its text.
 */
describe('Banner & language switcher', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let switcherPage: Page
  let outdatedPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[switcherPage, outdatedPage] = await Promise.all([
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/library', 'translated'),
      ),
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/de/kehrichtabfuhr', 'waste-collection'),
      ),
    ])
  })

  afterAll(async () => {
    await Promise.all([switcherPage.close(), outdatedPage.close()])
  })

  test('language switcher navigates to the translation and enters translating mode', async () => {
    const page = switcherPage
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('editing')

    // The switcher is either a dropdown (needs opening) or inline buttons. The
    // language option's `data-test` is the same in both variants. If a toggle
    // exists, click it first so the option becomes interactive.
    const toggle = page.locator('[data-test="language-switcher-toggle"]')
    if ((await toggle.count()) > 0) {
      await toggle.click()
    }
    await page.locator('[data-test="language-switcher-option-de"]').click()

    // The translation's alias, in the editor.
    await page.waitForURL(/\/de\/bibliothek\?/)
    await waitForEditorReady(page)
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')
  })

  test('mark-all-up-to-date dispatches the mutation and clears the banner count', async () => {
    const page = outdatedPage
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    // The banner counts the outdated translations: the node's and its text's.
    const banner = page.locator('[data-test="translations-banner"]')
    await banner.waitFor({ state: 'visible' })
    const initialCount = Number(
      (await banner.getAttribute('data-test-outdated-count')) ?? '0',
    )
    expect(initialCount).toBeGreaterThan(0)

    // Direct check: the text IS reported as outdated in DE (Drupal's
    // translation metadata → block.outdatedTranslations).
    expect(
      await page.evaluate((u) => {
        const app = window.__BLOKKLI__!.app!
        const blk = app.blocks.getAllBlocks().find((b) => b.uuid === u)
        return blk?.outdatedTranslations.includes('de') ?? false
      }, OUTDATED_TEXT),
      'the text should be reported as outdated in DE',
    ).toBe(true)

    const cleared = nextMutation(page, 'pbClearOutdatedTranslation')
    await page.locator('[data-test="translations-banner-mark-all"]').click()

    // The mutation's variables: langcode DE, uuids INCLUDE the text.
    const variables = await cleared
    expect(variables.langcode).toBe('de')
    expect(variables.uuids).toContain(OUTDATED_TEXT)

    await expect
      .poll(() => banner.getAttribute('data-test-outdated-count'))
      .toBe('0')

    // Drupal stored it: nothing is outdated after a reload either.
    await page.reload()
    await waitForEditorReady(page)
    await banner.waitFor({ state: 'visible' })
    expect(await banner.getAttribute('data-test-outdated-count')).toBe('0')
  })
})
