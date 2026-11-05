import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from '../../support/menu'
import { dialog, dismissMessages } from '../../support/overlays'
import { addBlock } from '../../support/blocks'
import { editorPath, openEditor, withApp } from '../../support/session'
import { emitEvent } from '../../support/events'
import {
  isModeChecked,
  isModeDisabled,
  publishLanguages,
  publishMode,
  translationStatuses,
} from '../../support/publish'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

const PER_LANGUAGE_PATH = editorPath('/de/eisbahn', 'unpublished-translations')
const SHARED_PATH = editorPath('/en/news/pool-closes', 'shared-draft')

/** Open the publish dialog from the app menu. */
async function openPublishDialog(page: Page): Promise<void> {
  await openAppMenu(page)
  await appMenuButton(page, 'publish').click()
  await dialog(page, 'publish').waitFor({ state: 'visible' })
}

/**
 * What Jonas (restricted_editor) may publish. He may edit pages, but not
 * change their published status: he can put changes live in a published
 * language, but not publish an unpublished one, as in Drupal's form.
 *
 * - `perLanguagePage`: the page "Ice rink" in German. English is published,
 *   German and French aren't.
 * - `sharedPage`: the unpublished news "Pool closes", whose languages share
 *   one status.
 */
describe('Publishing without the access to change the status', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let perLanguagePage: Page
  let sharedPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[perLanguagePage, sharedPage] = await Promise.all([
      openEditor(sandbox, 'Jonas Weber', PER_LANGUAGE_PATH),
      openEditor(sandbox, 'Jonas Weber', SHARED_PATH),
    ])
  })

  afterAll(async () => {
    await Promise.all([perLanguagePage, sharedPage].map((page) => page.close()))
  })

  async function cleanup(page: Page): Promise<void> {
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
    await Promise.all([perLanguagePage, sharedPage].map(cleanup))
  })

  test('an unpublished language cannot be ticked', async () => {
    await openPublishDialog(perLanguagePage)

    expect(await publishLanguages(perLanguagePage)).toEqual({
      en: { result: 'unchanged', checked: true, disabled: true },
      de: { result: 'unchanged', checked: false, disabled: true },
      fr: { result: 'unchanged', checked: false, disabled: true },
    })
    expect(
      await perLanguagePage
        .locator('[data-test="publish-not-allowed"]')
        .isVisible(),
    ).toBe(true)
    // The changes can go live in English.
    expect(
      await isModeDisabled(publishMode(perLanguagePage, 'immediate')),
    ).toBe(false)
  })

  test('Drupal refuses to publish an unpublished language', async () => {
    const response = await withApp(perLanguagePage, (app) =>
      app.adapter.publish!({
        hostEntityType: app.context.value.entityType,
        hostEntityUuid: app.context.value.entityUuid,
        closeAfterPublish: false,
        revisionLogMessage: '',
        languages: ['de'],
      }),
    )

    expect(response.success).toBe(false)
    expect(await translationStatuses(perLanguagePage)).toEqual({
      en: true,
      de: false,
      fr: false,
    })
  })

  test('an unpublished page can only be saved', async () => {
    await addBlock(sharedPage, {
      bundle: 'text',
      fieldName: 'field_paragraphs',
    })
    await openPublishDialog(sharedPage)

    expect(await publishLanguages(sharedPage)).toEqual({
      all: { result: 'unchanged', checked: false, disabled: true },
    })
    expect(
      await sharedPage.locator('[data-test="publish-not-allowed"]').isVisible(),
    ).toBe(true)
    expect(await isModeChecked(publishMode(sharedPage, 'save'))).toBe(true)
    expect(await isModeDisabled(publishMode(sharedPage, 'immediate'))).toBe(
      true,
    )
    expect(await isModeDisabled(publishMode(sharedPage, 'scheduled'))).toBe(
      true,
    )
  })
})
