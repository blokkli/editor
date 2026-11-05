import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from '../../support/menu'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { addBlock } from '../../support/blocks'
import { editorPath, openEditor, withApp } from '../../support/session'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import {
  isModeChecked,
  isModeDisabled,
  publishLanguages,
  publishMode,
  reopenAfterPublish,
  translationStatuses,
} from '../../support/publish'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * What the publish dialog publishes in which language.
 *
 * Drupal's content translation settings decide whether each translation has a
 * status of its own; news share one in E2E sandboxes
 * (blokkli_playground_test). The dialog lists the translations in its section
 * "Languages" (`data-test-result` on each row) and sends the ones to publish
 * with the mutation. The changes always cover every language.
 */
const PER_LANGUAGE_PATH = editorPath('/de/eisbahn', 'unpublished-translations')
const ORIGINAL_UNPUBLISHED_PATH = editorPath(
  '/de/strandbad',
  'original-unpublished',
)
const SHARED_PATH = editorPath('/en/news/pool-closes', 'shared-draft')
const SCHEDULED_PATH = editorPath('/de/schwimmbad', 'status-per-language')

/** Open the publish dialog from the app menu, without adding a change. */
async function openPublishDialog(page: Page): Promise<void> {
  await openAppMenu(page)
  await appMenuButton(page, 'publish').click()
  await dialog(page, 'publish').waitFor({ state: 'visible' })
}

/**
 * Page lifecycle: four editor pages, opened in parallel, each on a page of its
 * own. Publishing leaves the editor, so each page's publish runs last on it.
 *
 * - `perLanguagePage`: the page "Ice rink" in German. English is published,
 *   German and French aren't.
 * - `originalUnpublishedPage`: the page "Lido" in German. Only German is
 *   published.
 * - `sharedPage`: the unpublished news "Pool closes" in English.
 * - `scheduledPage`: the page "Swimming pool" in German. English is published,
 *   German isn't, and it has no French translation.
 */
describe('Publishing per language', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let perLanguagePage: Page
  let originalUnpublishedPage: Page
  let sharedPage: Page
  let scheduledPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[perLanguagePage, originalUnpublishedPage, sharedPage, scheduledPage] =
      await Promise.all([
        openEditor(sandbox, 'Anna Keller', PER_LANGUAGE_PATH),
        openEditor(sandbox, 'Anna Keller', ORIGINAL_UNPUBLISHED_PATH),
        openEditor(sandbox, 'Anna Keller', SHARED_PATH),
        openEditor(sandbox, 'Anna Keller', SCHEDULED_PATH),
      ])
  })

  afterAll(async () => {
    await Promise.all(
      [perLanguagePage, originalUnpublishedPage, sharedPage, scheduledPage].map(
        (page) => page.close(),
      ),
    )
  })

  async function cleanup(page: Page): Promise<void> {
    // A failed test can leave its page outside the editor after a publish.
    if (!(await page.evaluate(() => !!window.__BLOKKLI__?.app))) {
      return
    }
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
    await dismissMessages(page)
  }

  afterEach(async () => {
    await Promise.all(
      [perLanguagePage, originalUnpublishedPage, sharedPage, scheduledPage].map(
        cleanup,
      ),
    )
  })

  test('a translation can be published without changes', async () => {
    expect(
      await withApp(perLanguagePage, (app) => app.state.mutations.value.length),
    ).toBe(0)
    await openAppMenu(perLanguagePage)
    expect(await appMenuButton(perLanguagePage, 'publish').isDisabled()).toBe(
      false,
    )
  })

  test('the dialog lists each translation with what publishing does', async () => {
    await openPublishDialog(perLanguagePage)

    // English is published and stays so; German, the current language, is
    // ticked; French isn't.
    await expect
      .poll(() => publishLanguages(perLanguagePage))
      .toEqual({
        en: { result: 'unchanged', checked: true, disabled: true },
        de: { result: 'published', checked: true, disabled: false },
        fr: { result: 'unchanged', checked: false, disabled: false },
      })

    // Saving would put the changes live in English, and there are none.
    expect(await isModeDisabled(publishMode(perLanguagePage, 'save'))).toBe(
      true,
    )
    expect(await isModeChecked(publishMode(perLanguagePage, 'immediate'))).toBe(
      true,
    )

    // Without a language to publish, there's nothing to submit.
    await perLanguagePage
      .locator(
        '[data-test="publish-language-de"] [data-test="publish-languages-checkbox"]',
      )
      .click()
    await expect
      .poll(() => publishLanguages(perLanguagePage).then((rows) => rows.de))
      .toEqual({ result: 'unchanged', checked: false, disabled: false })
    expect(await dialogSubmit(perLanguagePage).isDisabled()).toBe(true)
  })

  // Last on its page: publishing leaves the editor.
  test('publishing publishes the ticked languages only', async () => {
    await openPublishDialog(perLanguagePage)

    const published = nextMutation(perLanguagePage, 'pbPublish')
    await dialogSubmit(perLanguagePage).click()
    expect((await published).languages).toEqual(['de'])

    await reopenAfterPublish(perLanguagePage, PER_LANGUAGE_PATH)
    expect(await translationStatuses(perLanguagePage)).toEqual({
      en: true,
      de: true,
      fr: false,
    })
  })

  // Last on its page: publishing leaves the editor.
  test('publishing from a translation leaves the original unpublished', async () => {
    await addBlock(originalUnpublishedPage, { fieldName: 'field_paragraphs' })
    await openPublishDialog(originalUnpublishedPage)

    // German is published: saving would put the changes live there.
    expect(
      await isModeDisabled(publishMode(originalUnpublishedPage, 'save')),
    ).toBe(true)
    expect(await publishLanguages(originalUnpublishedPage)).toEqual({
      en: { result: 'unchanged', checked: false, disabled: false },
      de: { result: 'unchanged', checked: true, disabled: true },
    })

    const published = nextMutation(originalUnpublishedPage, 'pbPublish')
    await dialogSubmit(originalUnpublishedPage).click()
    expect((await published).languages ?? []).toEqual([])

    await reopenAfterPublish(originalUnpublishedPage, ORIGINAL_UNPUBLISHED_PATH)
    expect(await translationStatuses(originalUnpublishedPage)).toEqual({
      en: false,
      de: true,
    })
  })

  // Last on its page: publishing leaves the editor.
  test('a shared status is one row, and publishing puts every language live', async () => {
    await openPublishDialog(sharedPage)

    expect(await publishLanguages(sharedPage)).toEqual({
      all: { result: 'published', checked: true, disabled: true },
    })

    const published = nextMutation(sharedPage, 'pbPublish')
    await dialogSubmit(sharedPage).click()
    expect((await published).languages).toEqual(['en'])

    await reopenAfterPublish(sharedPage, SHARED_PATH)
    expect(await translationStatuses(sharedPage)).toEqual({
      en: true,
      de: true,
      fr: true,
    })

    // Every language is published, and there are no changes.
    await openAppMenu(sharedPage)
    expect(await appMenuButton(sharedPage, 'publish').isDisabled()).toBe(true)
  })

  // Last on its page: the schedule stays.
  test('a schedule stores its languages', async () => {
    await openPublishDialog(scheduledPage)
    await publishMode(scheduledPage, 'scheduled').click()
    await expect
      .poll(() => publishLanguages(scheduledPage).then((rows) => rows.de))
      .toEqual({ result: 'scheduled', checked: true, disabled: false })

    // The default date is tomorrow at noon.
    const scheduled = nextMutation(scheduledPage, 'pbSchedule')
    await dialogSubmit(scheduledPage).click()
    expect((await scheduled).languages).toEqual(['de'])
    await dialog(scheduledPage, 'publish').waitFor({ state: 'hidden' })

    // Reopened, the dialog shows the schedule's languages, locked.
    await openPublishDialog(scheduledPage)
    await expect
      .poll(() => isModeChecked(publishMode(scheduledPage, 'scheduled')))
      .toBe(true)
    expect(await publishLanguages(scheduledPage)).toEqual({
      en: { result: 'unchanged', checked: true, disabled: true },
      de: { result: 'scheduled', checked: true, disabled: true },
    })
  })
})
