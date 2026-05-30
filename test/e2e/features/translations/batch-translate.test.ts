import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock } from './../../support/blocks'
import { blockHost, editableState } from './../../support/editable'
import { waitForAdapterCall } from './../../support/recorder'
import { dialog } from './../../support/overlays'
import {
  autoTranslateMockEntry,
  openTranslateDialog,
} from './../../support/translations'

/**
 * Set up the fixture for a batch-translate test: open the editor in EN, add
 * two cards (their default `title` is the source text we translate), then
 * switch the same browser context to `/de` so the persisted edit-state
 * carries the cards across. Returns the two card uuids.
 */
async function setupTwoCards() {
  const page = await openEditor('/page/1?blokkliEditing=1&testing=true', {
    localStorage: autoTranslateMockEntry(),
  })
  await expect
    .poll(() => withApp(page, (app) => app.state.editMode.value))
    .toBe('editing')

  const cardA = await addBlock(page, { bundle: 'card', fieldName: 'content' })
  const cardB = await addBlock(page, { bundle: 'card', fieldName: 'content' })
  if (!cardA || !cardB) {
    throw new Error('Failed to add cards.')
  }

  const deUrl = page.url().replace('/page/1', '/de/page/1')
  await page.goto(deUrl)
  await page.waitForFunction(() => Boolean(window.__BLOKKLI__?.app))
  await page.waitForFunction(
    () => !document.querySelector('[class*="z-init-overlay"]'),
  )
  await expect
    .poll(() => withApp(page, (app) => app.state.editMode.value))
    .toBe('translating')

  return { page, cardA, cardB }
}

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
 */
describe('Batch translate (TranslateDialog)', async () => {
  await setupEditorE2E()

  test("requests, applies, and mutates all added cards' editables", async () => {
    const { page, cardA, cardB } = await setupTwoCards()

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
    const hostA = await blockHost(page, cardA)
    const hostB = await blockHost(page, cardB)
    await page.waitForFunction(
      ({ ua, ub }) => {
        const app = window.__BLOKKLI__!.app!
        const a = app.directive.findEditableElement('title', {
          ...JSON.parse(ua),
        })
        const b = app.directive.findEditableElement('title', {
          ...JSON.parse(ub),
        })
        return (
          !!a?.textContent?.includes('[DE]') &&
          !!b?.textContent?.includes('[DE]')
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
    expect(sentUuids.has(cardA)).toBe(true)
    expect(sentUuids.has(cardB)).toBe(true)

    await page.close()
  })

  test('applying with one row unchecked excludes that row from the apply', async () => {
    const { page, cardA, cardB } = await setupTwoCards()

    await openTranslateDialog(page)
    const requestButton = page.locator(
      '[data-test="translations-batch-request"]',
    )
    const applyButton = page.locator('[data-test="translations-batch-apply"]')

    await requestButton.click()
    await expect.poll(() => applyButton.isDisabled()).toBe(false)

    // Uncheck the row keyed by cardA's title via its `data-test-key` attribute.
    // The checkbox is the row's `<input type="checkbox">`.
    const rowA = page.locator(
      `[data-test="translations-batch-row"][data-test-key="${cardA}:title"]`,
    )
    await rowA.waitFor({ state: 'visible' })
    await rowA.locator('input[type="checkbox"]').click()

    await applyButton.click()
    await dialog(page, 'translations-translate').waitFor({ state: 'hidden' })

    // Card B has been translated; Card A still shows its original EN title.
    const hostA = await blockHost(page, cardA)
    const hostB = await blockHost(page, cardB)
    await page.waitForFunction(
      ({ ub }) => {
        const app = window.__BLOKKLI__!.app!
        const b = app.directive.findEditableElement('title', JSON.parse(ub))
        return !!b?.textContent?.includes('[DE]')
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
    expect(sentTitleUuids.has(cardA)).toBe(false)
    expect(sentTitleUuids.has(cardB)).toBe(true)

    await page.close()
  })
})
