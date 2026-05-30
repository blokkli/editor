import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock } from './../../support/blocks'
import { waitForAdapterCall } from './../../support/recorder'
import { outdatedTranslationsEntry } from './../../support/translations'

/**
 * Tests for the LanguageSwitcher (toolbar) and the translations Banner.
 *
 * These flows route through the `changeLanguage` and `markTranslationUpToDate`
 * adapter methods, plus the Banner's UI signals (outdated count, dialog
 * triggers). They aren't as deep as the import/export flows, but they ARE the
 * primary entry points into the rest of the translations feature — if they
 * silently break, no other flow becomes reachable from the UI.
 */
describe('Banner & language switcher', async () => {
  await setupEditorE2E()

  test('language switcher navigates to the translation and enters translating mode', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
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

    // The mock's changeLanguage routes via router.push(e.url) — playground's
    // DE home is `/de`, not `/de/page/1`. Match `/de` followed by `?` or end.
    await page.waitForURL(/\/de(\?|$)/)
    await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
    await page.waitForFunction(
      () => !document.querySelector('[class*="z-init-overlay"]'),
    )
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    await page.close()
  })

  test('mark-all-up-to-date dispatches the mutation and clears the banner count', async () => {
    // Step 1 (EN): add a card. The outdated override (set up in step 2) keys
    // by uuid, so we need the uuid to seed before we reach DE.
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true')
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('editing')
    const uuid = await addBlock(page, {
      bundle: 'card',
      fieldName: 'content',
    })
    if (!uuid) throw new Error('Failed to add card.')

    // Step 2: re-open in /de with localStorage pre-seeded so Paragraph's
    // getEditContext sees that uuid as outdated in DE. Same browser context →
    // edit-state persists. The init script registers BEFORE the next
    // navigation, so when /de mounts the override is already in localStorage.
    const seed = outdatedTranslationsEntry({ [uuid]: ['de'] })
    await page.addInitScript((entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value)
      }
    }, seed)
    const deUrl = page.url().replace('/page/1', '/de/page/1')
    await page.goto(deUrl)
    await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
    await page.waitForFunction(
      () => !document.querySelector('[class*="z-init-overlay"]'),
    )
    await expect
      .poll(() => withApp(page, (app) => app.state.editMode.value))
      .toBe('translating')

    // Banner should now be visible with our seeded uuid contributing to the
    // count. The host page's fixture also marks pre-existing translated blocks
    // as outdated (Paragraph defaults `outdatedTranslations` to the existing
    // translation langs when unset), so the total count is inflated by the
    // fixture — we assert the count is > 0 and that OUR uuid is among the
    // outdated ones via the editor's block state.
    const banner = page.locator('[data-test="translations-banner"]')
    await banner.waitFor({ state: 'visible' })
    const initialCount = Number(
      (await banner.getAttribute('data-test-outdated-count')) ?? '0',
    )
    expect(initialCount).toBeGreaterThan(0)

    // Direct check: our seeded uuid IS reported as outdated in DE (i.e. the
    // override flowed through Paragraph.getEditContext → block.outdatedTranslations).
    expect(
      await page.evaluate((u) => {
        const app = window.__BLOKKLI__!.app!
        const blk = app.blocks.getAllBlocks().find((b) => b.uuid === u)
        return blk?.outdatedTranslations.includes('de') ?? false
      }, uuid),
      'seeded uuid should be reported as outdated in DE',
    ).toBe(true)

    await page.locator('[data-test="translations-banner-mark-all"]').click()

    // Adapter payload: langcode DE, uuids list INCLUDES our seeded uuid
    // (alongside any other fixture-outdated blocks).
    const call = await waitForAdapterCall<{
      uuids: string[]
      langcode: string
    }>(page, 'mark_translation_up_to_date')
    expect(call.langcode).toBe('de')
    expect(call.uuids).toContain(uuid)

    // Banner count is now 0 — MarkTranslationUpToDate writes an explicit
    // (empty for `de`) outdatedTranslations on each affected block, which
    // wins over both the default and our localStorage override.
    await expect
      .poll(() => banner.getAttribute('data-test-outdated-count'))
      .toBe('0')

    await page.close()
  })
})
