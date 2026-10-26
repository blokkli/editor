import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  dropAreaIds,
  dropOnArea,
  mediaLibraryItem,
  startDrag,
  type DragItem,
} from '../../support/dropAreas'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import { dismissMessages } from '../../support/overlays'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor, withApp } from '../../support/session'

const PATH = editorPath('/en/droppable', 'droppable')

// The widget of the page "Droppable" (content/nodes/droppable.yml).
const WIDGET = seedUuid('paragraph', 'droppable-widget')
const MEDIA_AREA = `droppable-field-add:${WIDGET}:field_media_items`
const LINKS_AREA = `droppable-field-add:${WIDGET}:field_link_items`

/**
 * A media dragged from the media library can be added to a field that takes
 * several values: the place "Add to …". Only to a reference field: the widget's
 * links take documents too, through an entity mapping (blokkli_playground_test),
 * but the editor can't add to a link field.
 *
 * Page lifecycle: Anna opens the page "Droppable". The last test adds the
 * document to the widget's media.
 */
describe('Adding a media to a field with several values', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let guide: Extract<DragItem, { itemType: 'media_library' }>

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PATH)
    const item = await mediaLibraryItem(page, 'The guide')
    if (item.itemType !== 'media_library') {
      throw new Error('The guide is no media.')
    }
    guide = item
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    await dismissMessages(page)
  })

  test('A reference field offers the place, a link field does not', async () => {
    await startDrag(page, guide)
    await expect.poll(() => dropAreaIds(page)).toContain(MEDIA_AREA)
    expect(await dropAreaIds(page)).not.toContain(LINKS_AREA)
  })

  // Last: it changes the widget's media.
  test('The media is added to the reference field', async () => {
    await startDrag(page, guide)
    await expect.poll(() => dropAreaIds(page)).toContain(MEDIA_AREA)

    const updated = nextMutation(page, 'pbUpdateDroppableField')
    await dropOnArea(page, MEDIA_AREA)
    expect(await updated).toMatchObject({
      paragraphUuid: WIDGET,
      fieldName: 'field_media_items',
      itemIds: [guide.mediaId],
    })

    const items = page.locator(
      '[data-test="widget-media-items"] [data-test="widget-media-item"]',
    )
    await expect.poll(() => items.count()).toBe(1)
    expect(await items.getAttribute('data-test-media-id')).toBe(guide.mediaId)
  })
})
