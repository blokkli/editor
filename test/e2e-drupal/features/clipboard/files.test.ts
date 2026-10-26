import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  withApp,
  BLOCKS_EDITOR_PATH,
  editorPath,
  openEditor,
} from '../../support/session'
import { emitEvent } from '../../support/events'
import { blockCount } from '../../support/blocks'
import { draggedBundles, dropDragInto } from '../../support/clipboard'
import { dismissMessages } from '../../support/overlays'
import { openSidebar } from '../../support/sidebar'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * Pasting files, or dragging them in from the OS: what's checked before a drag
 * starts, and before the upload dialog opens. The image field takes PNG, GIF,
 * JPEG and WebP files of up to 10 MB (its config); images become `image`
 * paragraphs, documents `link` ones, each type with its own. The files are
 * built in the page, of zeros: none is uploaded (see `upload.test.ts`).
 * Messages are matched by the file name they name, never by their translated
 * text.
 */

/** A file to paste or drag in. */
type TestFile = { name: string; type: string; size: number }

const PNG = { type: 'image/png', size: 100 }
/** One byte more than the image field allows. */
const TOO_LARGE = 10 * 1024 * 1024 + 1

/**
 * Dispatch a synthetic `paste`, or a native drag's `dragenter`, carrying files
 * built in the page. Unlike a real drag, the synthetic one tells the files'
 * names and sizes. Does not wait for anything.
 */
function dispatchFiles(
  page: Page,
  event: 'paste' | 'dragenter',
  files: TestFile[],
): Promise<void> {
  return page.evaluate(
    ({ event, files }) => {
      const dt = new DataTransfer()
      for (const { name, type, size } of files) {
        dt.items.add(new File([new Uint8Array(size)], name, { type }))
      }
      const init = { bubbles: true, cancelable: true }
      document.dispatchEvent(
        event === 'paste'
          ? new ClipboardEvent('paste', { ...init, clipboardData: dt })
          : new DragEvent('dragenter', { ...init, dataTransfer: dt }),
      )
    },
    { event, files },
  )
}

function isDragging(page: Page): Promise<boolean> {
  return withApp(page, (app) => app.selection.isDragging.value)
}

/** The bundle groups of the in-flight drag: one per type of file. */
function draggedBundleGroups(page: Page): Promise<string[][] | undefined> {
  return withApp(page, (app) => {
    const item = app.selection.dragItems.value[0]
    return item && 'itemBundleGroups' in item
      ? item.itemBundleGroups
      : undefined
  })
}

/** The number of blocks the in-flight drag adds. */
function draggedBlockCount(page: Page): Promise<number | undefined> {
  return withApp(page, (app) => {
    const item = app.selection.dragItems.value[0]
    return item && 'blockCount' in item ? item.blockCount : undefined
  })
}

/** Whether a message names the file. */
async function hasMessageFor(page: Page, fileName: string): Promise<boolean> {
  const texts = await page
    .locator('[data-test="message-close"]')
    .allTextContents()
  return texts.some((text) => text.includes(fileName))
}

/**
 * Page lifecycle: one editor page shared, on the page "Blocks". `afterEach`
 * ends a drag and dispatches `dragleave`, which resets the clipboard feature's
 * drag counter (see `native-drop.test.ts`), and clears the messages.
 * `translatorPage` (Élodie Favre, a translator, who may not create media) is
 * on the page "Library", whose edit state is hers: she edits it.
 */
describe('Pasting and dragging in files', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let translatorPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, translatorPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH),
      openEditor(
        sandbox,
        'Élodie Favre',
        editorPath('/en/library', 'translated'),
      ),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), translatorPage.close()])
  })

  afterEach(async () => {
    if (await isDragging(page)) {
      await emitEvent(page, 'dragging:end')
    }
    await page.evaluate(() => {
      document.dispatchEvent(
        new DragEvent('dragleave', { bubbles: true, cancelable: true }),
      )
    })
    await Promise.all([dismissMessages(page), dismissMessages(translatorPage)])
  })

  test('a pasted image larger than the field allows is refused', async () => {
    await dispatchFiles(page, 'paste', [
      { name: 'large.png', type: 'image/png', size: TOO_LARGE },
    ])

    await expect.poll(() => hasMessageFor(page, 'large.png')).toBe(true)
    expect(await isDragging(page)).toBe(false)
  })

  test('a pasted image of a format the field refuses is refused', async () => {
    await dispatchFiles(page, 'paste', [
      { name: 'drawing.bmp', type: 'image/bmp', size: 100 },
    ])

    await expect.poll(() => hasMessageFor(page, 'drawing.bmp')).toBe(true)
    expect(await isDragging(page)).toBe(false)
  })

  test('a user who may not create media cannot paste images', async () => {
    expect(
      await withApp(translatorPage, (app) => app.state.editMode.value),
    ).toBe('editing')
    await dispatchFiles(translatorPage, 'paste', [
      { name: 'photo.png', ...PNG },
    ])

    await expect
      .poll(() => hasMessageFor(translatorPage, 'photo.png'))
      .toBe(true)
    expect(await isDragging(translatorPage)).toBe(false)
  })

  test('a user who may not create media cannot upload to the media library', async () => {
    await Promise.all([
      openSidebar(page, 'media_library'),
      openSidebar(translatorPage, 'media_library'),
    ])
    await Promise.all([
      page.locator('[data-test="media-library"]').waitFor(),
      translatorPage.locator('[data-test="media-library"]').waitFor(),
    ])

    const upload = '[data-test="media-library-upload"]'
    expect(await page.locator(upload).count()).toBe(1)
    expect(await translatorPage.locator(upload).count()).toBe(0)
  })

  test('pasted images start a drag adding a block for each', async () => {
    await dispatchFiles(page, 'paste', [
      { name: 'first.png', ...PNG },
      { name: 'second.png', ...PNG },
    ])

    await expect.poll(() => isDragging(page)).toBe(true)
    expect(await draggedBundles(page)).toEqual(['image'])
    expect(await draggedBlockCount(page)).toBe(2)
  })

  test('dragged-in images start a drag adding a block for each', async () => {
    await dispatchFiles(page, 'dragenter', [
      { name: 'first.png', ...PNG },
      { name: 'second.png', ...PNG },
    ])

    expect(await draggedBundles(page)).toEqual(['image'])
    expect(await draggedBlockCount(page)).toBe(2)
  })

  test('a dragged-in image too large for the field is refused at the drop', async () => {
    await dispatchFiles(page, 'dragenter', [{ name: 'large.png', ...PNG }])
    // A real drag tells the file's size only at the drop.
    await page.evaluate((size) => {
      const item = window.__BLOKKLI__!.app!.selection.dragItems.value[0]
      if (!item || item.itemType !== 'native_drop') {
        throw new Error('No native drag in progress')
      }
      const dt = new DataTransfer()
      dt.items.add(
        new File([new Uint8Array(size)], 'large.png', { type: 'image/png' }),
      )
      item.dataTransfer = dt
    }, TOO_LARGE)
    const before = await blockCount(page)
    await dropDragInto(page, { fieldName: 'field_paragraphs' })

    await expect.poll(() => hasMessageFor(page, 'large.png')).toBe(true)
    expect(await blockCount(page)).toBe(before)
  })

  test('an image and a PDF dragged in start a drag, a block type for each', async () => {
    await dispatchFiles(page, 'dragenter', [
      { name: 'photo.png', ...PNG },
      { name: 'report.pdf', type: 'application/pdf', size: 100 },
    ])

    // A PDF can also become a widget: E2E sandboxes map documents to its
    // links (blokkli_playground_test).
    expect(await draggedBundleGroups(page)).toEqual([
      ['image'],
      ['link', 'widget'],
    ])
    expect(await draggedBlockCount(page)).toBe(2)
  })
})
