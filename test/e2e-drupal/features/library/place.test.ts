import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { dropAddAction, fieldUuids } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import {
  libraryDialog,
  libraryDialogItem,
  libraryDialogItems,
  shownLibraryItem,
} from '../../support/library'
import { countMutations, nextMutation } from '../../support/mutations'
import { closeFormOverlay, dismissMessages } from '../../support/overlays'
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

const PATH = editorPath('/en/library-place', 'library-place')

// The page "Library place" (content/nodes/library-place.yml) and the library
// items (content/library.yml).
const TEXT = seedUuid('paragraph', 'place-text')
const HOURS_ITEM = seedUuid('paragraphs_library_item', 'opening-hours')
const LINKS_ITEM = seedUuid('paragraphs_library_item', 'useful-links')
const UNPUBLISHED_ITEM = seedUuid(
  'paragraphs_library_item',
  'unpublished-notice',
)

/**
 * Place a library item in the page's content after a paragraph, as a drop
 * does: through the drop handler for library items, which the items of the
 * dialog "Add block from library" use when they're dragged onto the page.
 */
function dropLibraryItem(
  page: Page,
  libraryItemUuid: string,
  afterUuid: string,
): Promise<void> {
  return page.evaluate(
    async ({ libraryItemUuid, afterUuid }) => {
      const app = window.__BLOKKLI__!.app!
      const ctx = app.context.value
      const fieldName = 'field_paragraphs'
      await app.dragdrop.getDropHandler('reusable')!.execute({
        items: [
          {
            itemType: 'reusable',
            itemBundle: 'from_library',
            libraryItemUuid,
            element: () => document.body,
          },
        ],
        host: { type: ctx.entityType, uuid: ctx.entityUuid, fieldName },
        afterUuid,
        field: app.fields.find(ctx.entityUuid, fieldName)!,
        bundle: 'from_library',
      })
    },
    { libraryItemUuid, afterUuid },
  )
}

/**
 * The add action "From library" places a library item: a paragraph that shows
 * it. Its dialog lists the items of the types that the field takes.
 *
 * Page lifecycle: Anna opens the page "Library place". Items are placed after
 * its text, one test after the other, and the last test publishes the page.
 */
describe('Placing a library item', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  // Set by the tests that place an item.
  let placed: string[] = []

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

  test('The dialog lists the items that the user may view', async () => {
    await dropAddAction(page, 'library', { preceedingUuid: TEXT })

    // Anna doesn't administer the library: an unpublished item isn't listed.
    expect((await libraryDialogItems(page)).sort()).toEqual(
      [HOURS_ITEM, LINKS_ITEM].sort(),
    )
    expect(await libraryDialogItem(page, UNPUBLISHED_ITEM).count()).toBe(0)
  })

  test('Without a choice, nothing is placed', async () => {
    const added = countMutations(page, 'pbAddReusableParagraph')
    await dropAddAction(page, 'library', { preceedingUuid: TEXT })
    await libraryDialogItems(page)

    await page.locator('[data-test="library-submit"]').click()
    expect(await libraryDialog(page).isVisible()).toBe(true)
    expect(added()).toBe(0)
    expect(await fieldUuids(page)).toEqual([TEXT])
  })

  test('The chosen item is placed where the action was dropped', async () => {
    await dropAddAction(page, 'library', { preceedingUuid: TEXT })
    await libraryDialogItems(page)

    const item = libraryDialogItem(page, LINKS_ITEM)
    await item.click()
    expect(await item.getAttribute('data-test-selected')).toBe('true')

    const added = nextMutation(page, 'pbAddReusableParagraph')
    await page.locator('[data-test="library-submit"]').click()
    expect(await added).toMatchObject({
      libraryItemUuid: LINKS_ITEM,
      hostFieldName: 'field_paragraphs',
      afterUuid: TEXT,
    })
    await libraryDialog(page).waitFor({ state: 'detached' })

    await expect.poll(() => fieldUuids(page)).toHaveLength(2)
    const uuids = await fieldUuids(page)
    expect(uuids[0]).toBe(TEXT)
    expect(await shownLibraryItem(page, uuids[1]!)).toMatchObject({
      uuid: LINKS_ITEM,
      label: 'Useful links',
      paragraph: { bundle: 'link_list' },
    })
    placed = [uuids[1]!]
  })

  test('A dropped item is placed where it was dropped', async () => {
    const added = nextMutation(page, 'pbAddReusableParagraph')
    await dropLibraryItem(page, HOURS_ITEM, TEXT)
    expect(await added).toMatchObject({
      libraryItemUuid: HOURS_ITEM,
      afterUuid: TEXT,
    })

    await expect.poll(() => fieldUuids(page)).toHaveLength(3)
    const uuids = await fieldUuids(page)
    expect([uuids[0], uuids[2]]).toEqual([TEXT, placed[0]])
    expect(await shownLibraryItem(page, uuids[1]!)).toMatchObject({
      uuid: HOURS_ITEM,
      paragraph: { bundle: 'text' },
    })
    placed = [uuids[1]!, placed[0]!]
  })

  test('An item that the user may not view is not placed', async () => {
    const added = nextMutation(page, 'pbAddReusableParagraph')
    await dropLibraryItem(page, UNPUBLISHED_ITEM, TEXT)
    await added

    expect(await fieldUuids(page)).toEqual([TEXT, ...placed])
  })

  // Last: publishing ends the edit state.
  test('Publishing keeps the placed items', async () => {
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
    expect(await fieldUuids(page)).toEqual([TEXT, ...placed])
    expect((await shownLibraryItem(page, placed[0]!))?.uuid).toBe(HOURS_ITEM)
    expect((await shownLibraryItem(page, placed[1]!))?.uuid).toBe(LINKS_ITEM)
  })
})
