import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  blockState,
  dropAddAction,
  fieldUuids,
  selectBlock,
} from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { clickItemAction } from '../../support/itemActions'
import {
  detachFromLibrary,
  libraryDialog,
  libraryDialogItems,
  shownLibraryItem,
} from '../../support/library'
import { nextMutation } from '../../support/mutations'
import {
  closeFormOverlay,
  dismissMessages,
  shownMessages,
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

const PATH = editorPath('/en/library-detach', 'library-detach')

// The page "Library detach" (content/nodes/library-detach.yml) and its
// library items (content/library.yml).
const HOURS = seedUuid('paragraph', 'detach-hours')
const HOURS_AGAIN = seedUuid('paragraph', 'detach-hours-again')
const LINKS = seedUuid('paragraph', 'detach-links')
const UNPUBLISHED = seedUuid('paragraph', 'detach-unpublished')
const HOURS_ITEM = seedUuid('paragraphs_library_item', 'opening-hours')
const LINKS_ITEM = seedUuid('paragraphs_library_item', 'useful-links')
const UNPUBLISHED_ITEM = seedUuid(
  'paragraphs_library_item',
  'unpublished-notice',
)

/**
 * "Detach from library" puts a copy of the library item's paragraph in the
 * place of the paragraph that shows the item. The library item stays as it
 * is.
 *
 * Page lifecycle: Anna opens the page "Library detach". Its paragraphs are
 * detached one test after the other, and the last test publishes the page.
 */
describe('Detaching from the library', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  // Set by the tests that detach.
  let copies: string[] = []

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await libraryDialog(page).isVisible()) {
      await closeFormOverlay(page, 'library')
    }
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
  })

  test('The page shows the library items that the user may view', async () => {
    expect(await shownLibraryItem(page, HOURS)).toMatchObject({
      uuid: HOURS_ITEM,
      label: 'Opening hours',
      paragraph: { bundle: 'text' },
    })
    expect(await shownLibraryItem(page, LINKS)).toMatchObject({
      uuid: LINKS_ITEM,
      label: 'Useful links',
      paragraph: { bundle: 'link_list' },
    })
    // Anna doesn't administer the library: Drupal leaves out an unpublished
    // item.
    expect(await shownLibraryItem(page, UNPUBLISHED)).toBeNull()
  })

  test('Two paragraphs that show the same item get a copy each', async () => {
    const detached = nextMutation(page, 'pbDetachReusableParagraph')
    copies = await detachFromLibrary(page, [HOURS, HOURS_AGAIN])
    expect((await detached).uuids).toEqual([HOURS, HOURS_AGAIN])

    expect(copies[0]).not.toBe(copies[1])
    for (const copy of copies) {
      const { bundle, props } = await blockState(page, copy)
      expect(bundle).toBe('text')
      expect(props?.text).toContain('Monday to Friday, 8 to 12 o’clock.')
    }
    expect(await fieldUuids(page)).toEqual([...copies, LINKS, UNPUBLISHED])
  })

  test('A copy is a paragraph of the page', async () => {
    const updated = nextMutation(page, 'pbUpdateFieldValue')
    await page.evaluate(async (uuid) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.updateFieldValue!({
          uuid,
          fieldName: 'field_text',
          fieldValue: '<p>Open on Saturdays, too.</p>',
        }),
      )
    }, copies[0]!)
    expect((await updated).uuid).toBe(copies[0])

    await expect
      .poll(async () => (await blockState(page, copies[0]!)).props?.text)
      .toContain('Open on Saturdays, too.')
    // The other copy and the library item stay as they are.
    expect((await blockState(page, copies[1]!)).props?.text).toContain(
      'Monday to Friday',
    )
  })

  test('A copy has copies of the nested paragraphs', async () => {
    const [copy] = await detachFromLibrary(page, [LINKS])
    copies.push(copy!)

    expect((await blockState(page, copy!)).bundle).toBe('link_list')
    const links = await fieldUuids(page, 'field_paragraphs', copy)
    expect(links).toHaveLength(2)
    const titles = await Promise.all(
      links.map(async (uuid) => (await blockState(page, uuid)).props?.title),
    )
    expect(titles).toEqual(['Building permits', 'Waste collection'])
  })

  test('An item that the user may not view is not detached', async () => {
    await selectBlock(page, UNPUBLISHED)
    const detached = nextMutation(page, 'pbDetachReusableParagraph')
    await clickItemAction(page, 'library_detach')
    await detached

    await expect.poll(async () => (await shownMessages(page)).length).toBe(1)
    expect((await blockState(page, UNPUBLISHED)).bundle).toBe('from_library')
    expect(await fieldUuids(page)).toEqual([...copies, UNPUBLISHED])
  })

  // Last: publishing ends the edit state.
  test('Publishing keeps the copies, and the library its items', async () => {
    const published = await withApp(page, (app) =>
      app.adapter.publish!({
        hostEntityType: app.context.value.entityType,
        hostEntityUuid: app.context.value.entityUuid,
        closeAfterPublish: false,
        revisionLogMessage: '',
        languages: ['en'],
      }),
    )
    expect(published.success).toBe(true)

    await page.goto(url(PATH))
    await waitForEditorReady(page)
    expect(await fieldUuids(page)).toEqual([...copies, UNPUBLISHED])
    expect((await blockState(page, copies[0]!)).props?.text).toContain(
      'Open on Saturdays, too.',
    )
    expect(await fieldUuids(page, 'field_paragraphs', copies[2])).toHaveLength(
      2,
    )

    await dropAddAction(page, 'library')
    const items = await libraryDialogItems(page)
    expect(items).toContain(HOURS_ITEM)
    expect(items).toContain(LINKS_ITEM)
    expect(items).not.toContain(UNPUBLISHED_ITEM)
  })
})
