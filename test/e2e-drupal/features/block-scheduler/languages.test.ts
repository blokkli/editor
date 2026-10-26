import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  editorPath,
  openEditor,
  revertAllChanges,
  withApp,
} from '../../support/session'
import { selectBlock } from '../../support/blocks'
import { itemAction } from '../../support/itemActions'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import { scheduleDate } from '../../support/schedule'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

/**
 * A block's schedule applies to every language. While the languages differ,
 * the dialog's sections list each language's dates and, under "Publish on",
 * its status (`data-test-dates`, `data-test-published` on each row); a date
 * that is set goes to every translation.
 *
 * The page "Market day" (content/nodes/scheduled-text.yml): its first text is
 * scheduled in English only and unpublished in French without a date; its
 * second is published in every language, without dates.
 */
const PATH = editorPath('/en/market-day', 'scheduled-text')
const SCHEDULED = seedUuid('paragraph', 'scheduled-in-english')
const PUBLISHED = seedUuid('paragraph', 'published-everywhere')

type LanguageRow = { dates: string | null; published: string | null }

/** The rows of a section's list of languages, keyed by langcode. */
function languageRows(
  page: Page,
  type: 'publish' | 'unpublish',
): Promise<Record<string, LanguageRow>> {
  return page.evaluate((type) => {
    const prefix = `scheduler-${type}-language-`
    return Object.fromEntries(
      [...document.querySelectorAll(`[data-test^="${prefix}"]`)].map((row) => [
        row.getAttribute('data-test')!.replace(prefix, ''),
        {
          dates: row.getAttribute('data-test-dates'),
          published: row.getAttribute('data-test-published'),
        },
      ]),
    )
  }, type)
}

/** A block's status and "Publish on" date in each language, as Drupal has it. */
function translations(
  page: Page,
  uuid: string,
): Promise<Record<string, { isPublished: boolean; publishOn: string | null }>> {
  return page.evaluate((uuid) => {
    const app = window.__BLOKKLI__!.app!
    return Object.fromEntries(
      (app.state.getFieldListItem(uuid)?.editContext?.translations ?? []).map(
        (v) => [
          v.langcode,
          { isPublished: v.isPublished, publishOn: v.publishOn ?? null },
        ],
      ),
    )
  }, uuid)
}

/**
 * Page lifecycle: one editor page on "Market day", in English. Each test that
 * changes a schedule discards it afterwards, so every test starts from the
 * fixture's schedules.
 */
describe('The block scheduler in several languages', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /** The English date of the text scheduled in English only. */
  let englishDate: string

  async function openScheduler(uuid: string): Promise<void> {
    await selectBlock(page, uuid)
    await itemAction(page, 'block-scheduler').click()
    await dialog(page, 'block-scheduler').waitFor({ state: 'visible' })
  }

  async function submit() {
    const scheduled = nextMutation(page, 'pbSetParagraphSchedule')
    await dialogSubmit(page).click()
    return (await scheduled).items
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PATH)
    englishDate = (await translations(page, SCHEDULED)).en!.publishOn!
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await dialog(page, 'block-scheduler').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'block-scheduler').waitFor({ state: 'hidden' })
    }
    await dismissMessages(page)
    if (await withApp(page, (app) => app.state.mutations.value.length)) {
      await revertAllChanges(page)
    }
  })

  test('the fixture schedules the text in English only', async () => {
    expect(englishDate).toBeTruthy()
    expect(await translations(page, SCHEDULED)).toEqual({
      en: { isPublished: false, publishOn: englishDate },
      de: { isPublished: true, publishOn: null },
      fr: { isPublished: false, publishOn: null },
    })
  })

  test("lists each language's date and status while they differ", async () => {
    await openScheduler(SCHEDULED)

    expect(await languageRows(page, 'publish')).toEqual({
      en: { dates: englishDate, published: 'false' },
      de: { dates: '', published: 'true' },
      fr: { dates: '', published: 'false' },
    })

    // The date is only set for all languages at once.
    const publish = page.locator('[data-test="scheduler-publish"]')
    expect(await scheduleDate(page, publish).count()).toBe(0)
    expect(
      await page
        .locator('[data-test="scheduler-publish-override"]')
        .isVisible(),
    ).toBe(true)
  })

  test('lists no languages while they agree', async () => {
    await openScheduler(PUBLISHED)
    await page.locator('[data-test="scheduler-publish-toggle"]').click()

    const publish = page.locator('[data-test="scheduler-publish"]')
    await scheduleDate(page, publish).waitFor({ state: 'visible' })
    expect(await languageRows(page, 'publish')).toEqual({})
  })

  test('setting the date for all languages schedules every translation', async () => {
    await openScheduler(SCHEDULED)
    await page.locator('[data-test="scheduler-publish-override"]').click()

    // The list stays, to show what the date overwrites.
    const publish = page.locator('[data-test="scheduler-publish"]')
    await scheduleDate(page, publish).waitFor({ state: 'visible' })
    expect(Object.keys(await languageRows(page, 'publish'))).toEqual([
      'en',
      'de',
      'fr',
    ])

    // The English date, which German and French don't have yet.
    expect(await submit()).toEqual([
      { uuid: SCHEDULED, type: 'publish', date: englishDate },
    ])
    await expect
      .poll(() => translations(page, SCHEDULED))
      .toEqual({
        en: { isPublished: false, publishOn: englishDate },
        de: { isPublished: false, publishOn: englishDate },
        fr: { isPublished: false, publishOn: englishDate },
      })
  })

  test('removing the date publishes the translations that had one', async () => {
    await openScheduler(SCHEDULED)
    await page.locator('[data-test="scheduler-publish-toggle"]').click()

    const items = await submit()
    expect(items).toMatchObject([{ uuid: SCHEDULED, type: 'publish' }])
    expect(items[0]?.date ?? null).toBeNull()

    // French was unpublished without a date: it stays so.
    await expect
      .poll(() => translations(page, SCHEDULED))
      .toEqual({
        en: { isPublished: true, publishOn: null },
        de: { isPublished: true, publishOn: null },
        fr: { isPublished: false, publishOn: null },
      })
  })
})
