import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  editorPath,
  openEditor,
  waitForEditorReady,
  withApp,
} from '../../support/session'
import { selectBlock } from '../../support/blocks'
import { storedFieldValue } from '../../support/editable'
import { clickItemDropdownAction } from '../../support/itemActions'
import { appMenuButton, openAppMenu } from '../../support/menu'
import { dialog, dialogSubmit } from '../../support/overlays'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'

// The text of the page "Library" (content/nodes/translated.yml), translated
// into every language.
const TEXT = seedUuid('paragraph', 'translated-text')
const DE_PATH = editorPath('/de/bibliothek', 'translated')
const EN_PATH = editorPath('/en/library', 'translated')

/** The ids of the transforms in the item-actions dropdown. */
function transformActionIds(page: Page): Promise<string[]> {
  return withApp(page, (app) =>
    app.plugins
      .get('itemDropdownAction')
      .map((action) => action.id)
      .filter((id) => id.startsWith('transform-block-')),
  )
}

/** Fills a text input of the transform dialog's form. */
async function fillConfig(
  page: Page,
  name: string,
  value: string,
): Promise<void> {
  const input = page.locator(
    `[data-test="transform-dialog"] [data-test="config-form-${name}"] [data-test="form-text-input"]`,
  )
  await input.fill(value)
  // The input updates its value on "change".
  await input.dispatchEvent('change')
}

/**
 * The transform "Search and replace" (blokkli_playground) in translations.
 *
 * A transform plugin gets no language: one that works on translations is
 * derived, one plugin per language, which applies in its language and changes
 * it. The editor offers the plugins that apply in the language being edited.
 *
 * The edit state covers every language, and every request replays its
 * mutations. A transform that changed the language of the request would change
 * the language of whichever request replays it: publishing from the English
 * editor would lose a replacement made in the German one.
 *
 * Page lifecycle: the German and the English editor of the same page, opened
 * in parallel. The last test publishes from the English one.
 */
describe('Search and replace in translations', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let dePage: Page
  let enPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[dePage, enPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', DE_PATH),
      openEditor(sandbox, 'Anna Keller', EN_PATH),
    ])
  })

  afterAll(async () => {
    await Promise.all([dePage.close(), enPage.close()])
  })

  test('offers the transform of the language being edited', async () => {
    await selectBlock(dePage, TEXT)
    await expect
      .poll(() => transformActionIds(dePage))
      .toEqual(['transform-block-search_and_replace:de'])

    await selectBlock(enPage, TEXT)
    await expect
      .poll(() => transformActionIds(enPage))
      .toEqual(['transform-block-search_and_replace:en'])

    await emitEvent(dePage, 'select:unselect')
    await emitEvent(enPage, 'select:unselect')
  })

  // Last: publishing leaves the English editor.
  test('a replacement in German is published from the English editor', async () => {
    await selectBlock(dePage, TEXT)
    await expect.poll(() => transformActionIds(dePage)).toHaveLength(1)
    const [action] = await transformActionIds(dePage)
    await clickItemDropdownAction(dePage, action!)

    await fillConfig(dePage, 'search', 'Schulhaus')
    await fillConfig(dePage, 'replace', 'Rathaus')
    const transformed = nextMutation(dePage, 'pbApplyTransformPlugin')
    await dePage.locator('[data-test="transform-dialog-submit"]').click()
    await transformed
    await expect
      .poll(() => storedFieldValue(dePage, TEXT, 'field_text'))
      .toContain('Rathaus')

    // The English editor loads the edit state in an English request, and
    // publishes it.
    await enPage.goto(url(EN_PATH))
    await waitForEditorReady(enPage)
    expect(await storedFieldValue(enPage, TEXT, 'field_text')).toContain(
      'old school house',
    )
    await openAppMenu(enPage)
    await appMenuButton(enPage, 'publish').click()
    await dialog(enPage, 'publish').waitFor({ state: 'visible' })
    const published = nextMutation(enPage, 'pbPublish')
    await dialogSubmit(enPage).click()
    await published
    await enPage.waitForURL((u) => !u.searchParams.has('blokkliEditing'))

    // The German text has the replacement.
    await dePage.goto(url(DE_PATH))
    await waitForEditorReady(dePage)
    const text = await storedFieldValue(dePage, TEXT, 'field_text')
    expect(text).toContain('Rathaus')
    expect(text).not.toContain('Schulhaus')
  })
})
