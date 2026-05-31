import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { blockHost, editableState } from './../../support/editable'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { dialog } from './../../support/overlays'
import {
  addCardWithSourceTitle,
  autoTranslateMockEntry,
  openTranslateDialog,
} from './../../support/translations'

/**
 * Regression tests for the batch-translate flow (TranslateDialog).
 *
 * What's under test: load source texts → request translations from the mocked
 * service → apply selected ones via `importTranslationsBatched`. The apply is
 * the load-bearing operation — its payload determines what actually changes,
 * and the DOM update afterwards is the user-visible result.
 *
 * Why both assertions: a shallow test (just adapter call OR just DOM) misses
 * the failure modes that matter — sending the wrong items, or sending right
 * items that fail to render. We assert both.
 *
 * Page lifecycle: one editor page shared, opened **directly in /de** with the
 * auto-translate mock seeded. Skipping the EN→DE goto saves ~2.3s per test.
 * `beforeEach` clears the adapter recorder. Each test adds its own two cards
 * via `addCardWithSourceTitle`; prior tests' cards remain in mock state but
 * don't interfere — each test's adapter-call assertion is keyed on its own
 * uuids.
 */
describe('Batch translate (TranslateDialog)', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor('/de/page/1?blokkliEditing=1&testing=true', {
      localStorage: autoTranslateMockEntry(),
    })
    await page.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await page.close()
  })

  beforeEach(async () => {
    await clearAdapterCalls(page)
  })

  test("requests, applies, and mutates all added cards' editables", async () => {
    const a = await addCardWithSourceTitle(page)
    const b = await addCardWithSourceTitle(page)

    await openTranslateDialog(page)

    const rows = page.locator('[data-test="translations-batch-row"]')
    // Sanity: at least the two added cards' titles are in the table (plus the
    // host's translatable fields). We assert a lower bound, not an exact count,
    // because the host page brings its own translatable fields.
    expect(await rows.count()).toBeGreaterThanOrEqual(2)

    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    expect(await applyButton.isDisabled()).toBe(true)
    await requestButton.click()
    // Apply unlocks once requestTranslation resolves.
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // BOTH added cards' title editables should now show the `[DE] …` mock
    // translation. Wait on each one — the mutation patches asynchronously.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ua, ub }) => {
        const app = window.__BLOKKLI__!.app!
        const ea = app.directive.findEditableElement('title', JSON.parse(ua))
        const eb = app.directive.findEditableElement('title', JSON.parse(ub))
        return (
          !!ea?.textContent?.includes('[DE]') &&
          !!eb?.textContent?.includes('[DE]')
        )
      },
      { ua: JSON.stringify(hostA), ub: JSON.stringify(hostB) },
    )

    // Both cards' applied state matches the mock decoration and carries no
    // residual diff markup.
    const stateA = await editableState(page, 'title', hostA)
    const stateB = await editableState(page, 'title', hostB)
    expect(stateA?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateB?.text.trim()).toMatch(/^\[DE\] /)
    expect(stateA?.hasDiffMarkup).toBe(false)
    expect(stateB?.hasDiffMarkup).toBe(false)

    // Adapter payload: langcode is DE, items list includes BOTH cards' title
    // field. A regression that drops one card from the apply would fail here.
    const call = await waitForAdapterCall<{
      items: Array<{ langcode: string; uuid: string; fieldName: string }>
      markUpToDate?: boolean
    }>(page, 'import_translations_batched')
    const langs = new Set(call.items.map((i) => i.langcode))
    expect([...langs]).toEqual(['de'])
    const sentUuids = new Set(
      call.items.filter((i) => i.fieldName === 'title').map((i) => i.uuid),
    )
    expect(sentUuids.has(a.uuid)).toBe(true)
    expect(sentUuids.has(b.uuid)).toBe(true)
  })

  test('applying with one row unchecked excludes that row from the apply', async () => {
    const a = await addCardWithSourceTitle(page)
    const b = await addCardWithSourceTitle(page)

    await openTranslateDialog(page)
    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    await requestButton.click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    // Uncheck the row keyed by cardA's title via its `data-test-key` attribute.
    const rowA = page.locator(
      `[data-test="translations-batch-row"][data-test-key="${a.uuid}:title"]`,
    )
    await rowA.waitFor({ state: 'visible' })
    await rowA.locator('[data-test="translations-batch-row-checkbox"]').click()

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Card B has been translated; Card A still shows its original EN title.
    const hostA = await blockHost(page, a.uuid)
    const hostB = await blockHost(page, b.uuid)
    await page.waitForFunction(
      ({ ub }) => {
        const app = window.__BLOKKLI__!.app!
        const eb = app.directive.findEditableElement('title', JSON.parse(ub))
        return !!eb?.textContent?.includes('[DE]')
      },
      { ub: JSON.stringify(hostB) },
    )

    const titleA =
      (await editableState(page, 'title', hostA))?.text.trim() ?? ''
    expect(titleA).not.toContain('[DE]')

    // Adapter call: card A's title is NOT in the items, card B's title IS.
    const call = await waitForAdapterCall<{
      items: Array<{ uuid: string; fieldName: string; langcode: string }>
    }>(page, 'import_translations_batched')
    const sentTitleUuids = new Set(
      call.items.filter((i) => i.fieldName === 'title').map((i) => i.uuid),
    )
    expect(sentTitleUuids.has(a.uuid)).toBe(false)
    expect(sentTitleUuids.has(b.uuid)).toBe(true)
  })
})
