import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  blockExists,
  blockState,
  dropAddAction,
  fieldUuids,
  selectBlock,
} from '../../support/blocks'
import { emitEvent } from '../../support/events'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from '../../support/itemActions'
import {
  detachFromLibrary,
  libraryDialog,
  libraryDialogItems,
  shownLibraryItem,
} from '../../support/library'
import { countMutations, nextMutation } from '../../support/mutations'
import {
  closeFormOverlay,
  dialog,
  dialogSubmit,
  dismissMessages,
} from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  editorPath,
  openEditor,
  waitForEditorReady,
  withApp,
} from '../../support/session'

const PATH = editorPath('/en/library-add', 'library-add')
const PATH_DE = editorPath('/de/bibliothek-neu', 'library-add')

// The page "Library add" (content/nodes/library-add.yml).
const TEXT = seedUuid('paragraph', 'add-text')
const LINKS = seedUuid('paragraph', 'add-links')
const LINK = seedUuid('paragraph', 'add-link-library')
const COLUMNS = seedUuid('paragraph', 'add-columns')

/** Open the dialog "Add to library" for a paragraph. */
async function openDialog(page: Page, uuid: string): Promise<void> {
  await selectBlock(page, uuid)
  await clickItemAction(page, 'library_make_reusable')
  await dialog(page, 'library-reusable').waitFor({ state: 'visible' })
}

/**
 * Add a paragraph to the library with the dialog, and wait until the editor
 * shows the paragraph that takes its place. Resolves with the variables that
 * reached Drupal and the UUID of that paragraph, which the editor selects.
 */
async function addToLibrary(page: Page, uuid: string, label: string) {
  await openDialog(page, uuid)
  await dialog(page, 'library-reusable')
    .locator('[data-test="form-text-input"]')
    .fill(label)
  const added = nextMutation(page, 'pbMakeParagraphReusable')
  await dialogSubmit(page).click()
  const variables = await added
  await dialog(page, 'library-reusable').waitFor({ state: 'detached' })
  await page.waitForFunction(
    (uuid) => !window.__BLOKKLI__!.app!.blocks.getBlock(uuid),
    uuid,
  )
  const selected = await withApp(page, (app) => app.selection.uuids.value)
  return { variables, uuid: selected[0]! }
}

/**
 * "Add to library" makes a library item of a paragraph. A paragraph that
 * shows the item takes the paragraph's place. The item is saved when the page
 * is published; until then, it can be detached again.
 *
 * Page lifecycle: Anna opens the page "Library add" in English, and its German
 * translation. The text and the link list go into the library, the text comes
 * out of it again, and the last test publishes the page.
 */
describe('Adding to the library', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let translationPage: Page

  // Set by the tests that add to the library.
  let textReusable = ''
  let textItem = ''
  let linksReusable = ''
  let linksItem = ''
  let textCopy = ''

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, translationPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', PATH),
      openEditor(sandbox, 'Anna Keller', PATH_DE),
    ])
    await translationPage.waitForFunction(
      () => window.__BLOKKLI__?.app?.state.editMode.value === 'translating',
    )
  })

  afterAll(async () => {
    await Promise.all([page.close(), translationPage.close()])
  })

  afterEach(async () => {
    if (await dialog(page, 'library-reusable').isVisible()) {
      await page.locator('[data-test="dialog-cancel"]').click()
      await dialog(page, 'library-reusable').waitFor({ state: 'detached' })
    }
    if (await libraryDialog(page).isVisible()) {
      await closeFormOverlay(page, 'library')
    }
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
  })

  test('The library takes the types and fields that allow it', async () => {
    await selectBlock(page, TEXT)
    expect(await itemActionDisabled(page, 'library_make_reusable')).toBe(false)

    // Columns may not become a library item.
    await selectBlock(page, COLUMNS)
    expect(await itemActionDisabled(page, 'library_make_reusable')).toBe(true)

    // A link may, but not in a link list: its field takes no library items.
    await selectBlock(page, LINK)
    expect(await itemActionDisabled(page, 'library_make_reusable')).toBe(true)

    // A translation shares the structure: nothing goes into the library there.
    await selectBlock(translationPage, TEXT)
    await itemAction(translationPage, 'translate').waitFor({
      state: 'attached',
    })
    expect(
      await itemAction(translationPage, 'library_make_reusable').count(),
    ).toBe(0)
  })

  test('The dialog needs a description', async () => {
    const added = countMutations(page, 'pbMakeParagraphReusable')
    await openDialog(page, TEXT)
    expect(await dialogSubmit(page).isDisabled()).toBe(true)

    await page.locator('[data-test="dialog-cancel"]').click()
    await dialog(page, 'library-reusable').waitFor({ state: 'detached' })
    expect(added()).toBe(0)
    expect(await blockState(page, TEXT)).toMatchObject({ bundle: 'text' })
  })

  test('A paragraph becomes one that shows the new library item', async () => {
    const before = await fieldUuids(page)
    const { variables, uuid } = await addToLibrary(page, TEXT, 'Saturdays')
    expect(variables).toMatchObject({ uuid: TEXT, label: 'Saturdays' })

    // It takes the paragraph's place.
    expect(await fieldUuids(page)).toEqual(
      before.map((v) => (v === TEXT ? uuid : v)),
    )
    expect((await blockState(page, uuid)).bundle).toBe('from_library')

    const shown = await shownLibraryItem(page, uuid)
    expect(shown).toMatchObject({
      label: 'Saturdays',
      paragraph: { bundle: 'text' },
    })
    expect(shown!.paragraph.props.text).toContain(
      'The town hall is open on Saturdays.',
    )
    // The library item has a copy: the page's earlier revisions keep the text.
    expect(shown!.paragraph.uuid).not.toBe(TEXT)
    textReusable = uuid
    textItem = shown!.uuid
  })

  test('Its nested paragraphs come along', async () => {
    const { uuid } = await addToLibrary(page, LINKS, 'Town links')

    const shown = await shownLibraryItem(page, uuid)
    expect(shown).toMatchObject({
      label: 'Town links',
      paragraph: { bundle: 'link_list' },
    })
    expect(
      shown!.paragraph.props.paragraphs.map(
        (link: { props: { title: string } }) => link.props.title,
      ),
    ).toEqual(['The library', 'The pool'])
    // Copies, with UUIDs of their own: the links left the page.
    expect(shown!.paragraph.uuid).not.toBe(LINKS)
    expect(
      shown!.paragraph.props.paragraphs.map(
        (link: { uuid: string }) => link.uuid,
      ),
    ).not.toContain(LINK)
    expect(await blockExists(page, LINK)).toBe(false)
    linksReusable = uuid
    linksItem = shown!.uuid
  })

  test('A new library item can be detached before publishing', async () => {
    const [copy] = await detachFromLibrary(page, [textReusable])

    expect(await blockState(page, copy!)).toMatchObject({ bundle: 'text' })
    expect((await blockState(page, copy!)).props?.text).toContain(
      'The town hall is open on Saturdays.',
    )
    textCopy = copy!
  })

  // Last: publishing ends the edit state.
  test('Publishing saves the library items that are still placed', async () => {
    const published = await withApp(page, (app) =>
      app.adapter.publish!({
        hostEntityType: app.context.value.entityType,
        hostEntityUuid: app.context.value.entityUuid,
        closeAfterPublish: false,
        revisionLogMessage: '',
        languages: ['en', 'de'],
      }),
    )
    expect(published.success).toBe(true)

    await page.goto(url(PATH))
    await waitForEditorReady(page)
    expect(await fieldUuids(page)).toEqual([textCopy, linksReusable, COLUMNS])
    expect(await shownLibraryItem(page, linksReusable)).toMatchObject({
      uuid: linksItem,
      label: 'Town links',
      paragraph: { bundle: 'link_list' },
    })

    // The library offers the item. The one that was detached went with the
    // paragraph that showed it.
    await dropAddAction(page, 'library')
    const items = await libraryDialogItems(page)
    expect(items).toContain(linksItem)
    expect(items).not.toContain(textItem)
  })
})
