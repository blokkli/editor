import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Frame, Page } from 'playwright-core'
import { addBlock, blockExists, selectBlock } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { clickItemAction } from '../../support/itemActions'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from '../../support/menu'
import { nextMutation } from '../../support/mutations'
import {
  closeFormOverlay,
  dialog,
  dialogSubmit,
  dismissMessages,
  formOverlay,
} from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor, withApp } from '../../support/session'

// The links in the link list of the page "Downloads"
// (content/nodes/downloads.yml): one to a document, one with a title that is
// too long for its field.
const DOCUMENT_LINK = seedUuid('paragraph', 'downloads-document')
const LONG_LINK = seedUuid('paragraph', 'downloads-long')

/**
 * Drupal validates the paragraphs of every level, and takes a link to a
 * document.
 *
 * - A violation of a nested paragraph is reported like one of the page's own,
 *   and holds the publishing back.
 * - An editor may view a document, but not edit it. Drupal alone calls a link
 *   to it inaccessible. An entity mapping allows documents in the link of a
 *   link, so paragraphs_blokkli asks whether the user may view the document:
 *   the link is no violation, and its form saves.
 *
 * Page lifecycle: one editor page for Anna Keller on the page "Downloads".
 * The last test publishes, which leaves the editor.
 */
describe('Publishing nested paragraphs', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /** The paragraphs that the edit state reports a violation for. */
  function violatingUuids(): Promise<(string | undefined)[]> {
    return withApp(page, (app) =>
      app.state.violations.value.map((violation) => violation.entityUuid),
    )
  }

  /**
   * Adds a text to give the editor a pending mutation (Publish is disabled
   * without one), then opens the publish dialog.
   */
  async function openPublishDialog(): Promise<void> {
    await addBlock(page, { fieldName: 'field_paragraphs' })
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
  }

  /** Drupal's form of the paragraph that is edited. */
  async function editForm(): Promise<Frame> {
    const handle = await page
      .locator('[data-test="edit-form-frame"]')
      .elementHandle()
    const frame = await handle?.contentFrame()
    if (!frame) {
      throw new Error('The form has no frame.')
    }
    return frame
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/downloads', 'downloads'),
    )
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // The last test leaves the editor.
    if (!(await page.evaluate(() => !!window.__BLOKKLI__?.app))) {
      return
    }
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
    if (await formOverlay(page, 'edit-form').isVisible()) {
      await closeFormOverlay(page, 'edit-form')
    }
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
  })

  test('the edit state reports the nested violation, and none for the document', async () => {
    expect(await violatingUuids()).toEqual([LONG_LINK])
  })

  test('the nested violation holds the publishing back', async () => {
    await openPublishDialog()
    const published = nextMutation(page, 'pbPublish')
    await dialogSubmit(page).click()
    await published

    const errorsPanel = page.locator('[data-test="publish-validation-errors"]')
    await errorsPanel.waitFor({ state: 'visible' })
    const items = errorsPanel.locator('[data-test="publish-violation-item"]')
    await expect.poll(() => items.count()).toBe(1)
    expect(await dialog(page, 'publish').isVisible()).toBe(true)

    // It leads to the link in the list.
    await items
      .first()
      .locator('[data-test="publish-violation-button"]')
      .click()
    await dialog(page, 'publish').waitFor({ state: 'hidden' })
    expect(await withApp(page, (app) => app.selection.uuids.value)).toEqual([
      LONG_LINK,
    ])
  })

  test('the form of the link to the document saves', async () => {
    const stored = await withApp(
      page,
      (app) => app.state.mutations.value.length,
    )

    await selectBlock(page, DOCUMENT_LINK)
    await clickItemAction(page, 'edit')
    await formOverlay(page, 'edit-form').waitFor({ state: 'visible' })

    // Drupal's own markup: its forms name their elements for scripts.
    const form = await editForm()
    const title = form.locator(
      '[data-drupal-selector="edit-field-title-0-value"]',
    )
    await title.waitFor({ state: 'visible' })

    // The form shows where the link goes. Drupal alone leaves that empty for
    // a user who may not open the target, and would then ask for a link.
    const target = form.locator(
      '[data-drupal-selector="edit-field-link-0-uri"]',
    )
    expect(await target.inputValue()).toMatch(/^entity:media\/\d+$/)

    await title.fill('The guide, revised')
    await form.locator('[data-drupal-selector="edit-actions-submit"]').click()

    // A form that Drupal refuses stays open, with its errors.
    await formOverlay(page, 'edit-form').waitFor({ state: 'hidden' })
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBe(stored + 1)
    expect(await violatingUuids()).toEqual([LONG_LINK])
  })

  // Last: publishing leaves the editor.
  test('without the nested violation, the page is published', async () => {
    await selectBlock(page, LONG_LINK)
    const deleted = nextMutation(page, 'pbDeleteMultipleParagraphs')
    await clickItemAction(page, 'delete')
    await deleted
    await expect.poll(() => blockExists(page, LONG_LINK)).toBe(false)
    expect(await violatingUuids()).toEqual([])

    await openPublishDialog()
    const published = nextMutation(page, 'pbPublish')
    await dialogSubmit(page).click()
    await published
    await page.waitForURL((url) => !url.searchParams.has('blokkliEditing'))
  })
})
