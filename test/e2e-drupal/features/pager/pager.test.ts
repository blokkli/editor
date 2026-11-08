import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import type { Coord } from '../../../../src/runtime/editor/types/geometry'
import {
  blockViewportRect,
  fieldUuids,
  nextFrames,
  selectBlock,
} from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { clickItemAction } from '../../support/itemActions'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  editorPath,
  openEditor,
  revertAllChanges,
  withApp,
} from '../../support/session'
import { openSidebar } from '../../support/sidebar'
import {
  closeViewOptions,
  openViewOptions,
  viewOption,
} from '../../support/toolbar'

/**
 * While editing, a field in proxy mode renders as a pager: a band of pages, one
 * per block, and below it the block the field shows, as a real block. The page
 * of a block the field doesn't show is that block's element, so clicking it
 * selects the block, which shows it. Pages that don't fit in the band aren't
 * rendered.
 *
 * On content/nodes/pager.yml: a text, a gallery of three images (slider), a
 * text, a gallery of 20 images, more than fit in its band, and a text.
 */

const PAGER_EDITOR_PATH = editorPath('/en/pager', 'pager')
const FIELD = 'field_paragraphs'
const GALLERY = seedUuid('paragraph', 'pager-gallery')
const IMAGES = [1, 2, 3].map((i) => seedUuid('paragraph', `pager-image-${i}`))
const BETWEEN = seedUuid('paragraph', 'pager-between')
const LONG_GALLERY = seedUuid('paragraph', 'pager-long-gallery')
const LONG_IMAGES = Array.from({ length: 20 }, (_, i) =>
  seedUuid('paragraph', `pager-long-${i + 1}`),
)
const OUTRO = seedUuid('paragraph', 'pager-outro')

/** The band of a gallery. */
function band(page: Page, gallery: string): Locator {
  return page.locator(`[data-bk-uuid="${gallery}"] [data-test="field-pager"]`)
}

/** The page of a block in its band. */
function pageOf(page: Page, uuid: string): Locator {
  return page.locator(`[data-test="field-pager-page"][data-bk-uuid="${uuid}"]`)
}

/**
 * The element the editor registered for a block: its page in the band, its
 * real element, or nothing.
 */
function registeredAs(
  page: Page,
  uuid: string,
): Promise<'page' | 'block' | null> {
  return page.evaluate((uuid) => {
    const element = window.__BLOKKLI__!.app!.dom.registeredBlocks.value[uuid]
    if (!element) {
      return null
    }
    return element.dataset.test === 'field-pager-page' ? 'page' : 'block'
  }, uuid)
}

function selectedUuids(page: Page): Promise<string[]> {
  return withApp(page, (app) => [...app.selection.uuids.value])
}

/** Show a block of a gallery, by selecting it, and wait until it's rendered. */
async function show(page: Page, uuid: string): Promise<void> {
  await selectBlock(page, uuid)
  await expect.poll(() => registeredAs(page, uuid)).toBe('block')
}

/** The centre of a block's element in the viewport, once it's in view. */
async function centerOf(page: Page, uuid: string): Promise<Coord> {
  await emitEvent(page, 'scrollIntoView', { uuid, immediate: true })
  await nextFrames(page)
  const rect = await blockViewportRect(page, uuid)
  if (!rect) {
    throw new Error(`The block ${uuid} has no rectangle.`)
  }
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/**
 * Centre a gallery's band in the viewport: dragging near an edge scrolls the
 * page, which moves the drop slots away from the pointer.
 */
async function centerBand(page: Page, gallery: string): Promise<void> {
  await page.evaluate((key) => {
    const app = window.__BLOKKLI__!.app!
    app.dom.refreshFieldRect(key)
    const rect = app.dom.getFieldRect(key)
    if (rect) {
      app.eventBus.emit('scrollIntoView', { rect, immediate: true })
    }
  }, `${gallery}:${FIELD}`)
  await nextFrames(page)
}

/** Click a page with the real pointer, holding a modifier key. */
async function clickPage(
  page: Page,
  uuid: string,
  modifier?: 'Shift' | 'Control',
): Promise<void> {
  const box = (await pageOf(page, uuid).boundingBox())!
  if (modifier) {
    await page.keyboard.down(modifier)
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  if (modifier) {
    await page.keyboard.up(modifier)
  }
}

/** The selected blocks, sorted, for comparing with a set. */
async function selectedSorted(page: Page): Promise<string[]> {
  return (await selectedUuids(page)).sort()
}

type ActionsBarFrame = {
  /** The bar's transform, which places it. */
  transform: string
  visible: boolean
  selected: string[]
}

/**
 * The actions bar on each of the next frames: where it is, whether it's
 * visible, and what's selected.
 */
function recordActionsBar(
  page: Page,
  frames: number,
): Promise<ActionsBarFrame[]> {
  return page.evaluate((frames) => {
    const app = window.__BLOKKLI__!.app!
    const recorded: ActionsBarFrame[] = []
    return new Promise<ActionsBarFrame[]>((resolve) => {
      function record() {
        const bar = document.querySelector<HTMLElement>(
          '[data-test="actions-toolbar"]',
        )
        recorded.push({
          transform: bar?.style.transform ?? '',
          visible: !!bar && bar.style.visibility !== 'hidden',
          selected: [...app.selection.uuids.value],
        })
        if (recorded.length < frames) {
          requestAnimationFrame(record)
        } else {
          resolve(recorded)
        }
      }
      requestAnimationFrame(record)
    })
  }, frames)
}

/**
 * Page lifecycle: one editor page. Every test shows the blocks it needs first:
 * the pagers keep showing what they showed last, also across a revert.
 * `afterEach` discards the changes of the tests that copy, move or delete. The
 * tests that open the structure sidebar come last but one: while it closes, the
 * bands get wider, and so does the number of pages that fit.
 */
describe('A field in proxy mode', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', PAGER_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    await emitEvent(page, 'sidebar:close')
    await emitEvent(page, 'select:unselect')
    if (await withApp(page, (app) => app.state.mutations.value.length)) {
      await revertAllChanges(page)
    }
  })

  test('renders a band of pages, and the block it shows as a real block', async () => {
    const pages = band(page, GALLERY).locator('[data-test="field-pager-page"]')
    await expect.poll(() => pages.count()).toBe(3)
    expect(await pageOf(page, IMAGES[0]!).getAttribute('data-test-shown')).toBe(
      'true',
    )

    // The shown image is registered with its real element, the others with
    // their pages.
    expect(await registeredAs(page, IMAGES[0]!)).toBe('block')
    expect(await registeredAs(page, IMAGES[1]!)).toBe('page')
    expect(await registeredAs(page, IMAGES[2]!)).toBe('page')

    // The shown image has its page and its real element, the others only
    // their page: the slider of the site isn't rendered.
    expect(await page.locator(`[data-bk-uuid="${IMAGES[0]}"]`).count()).toBe(2)
    expect(await page.locator(`[data-bk-uuid="${IMAGES[1]}"]`).count()).toBe(1)
  })

  test('clicking a page selects its block and shows it', async () => {
    await show(page, IMAGES[0]!)
    await emitEvent(page, 'select:unselect')

    const point = await centerOf(page, IMAGES[1]!)
    await page.mouse.click(point.x, point.y)

    await expect.poll(() => selectedUuids(page)).toEqual([IMAGES[1]])
    await expect.poll(() => registeredAs(page, IMAGES[1]!)).toBe('block')
    expect(await registeredAs(page, IMAGES[0]!)).toBe('page')
    expect(await pageOf(page, IMAGES[1]!).getAttribute('data-test-shown')).toBe(
      'true',
    )
  })

  test('the actions bar goes straight from one page to the page clicked next', async () => {
    await show(page, IMAGES[0]!)
    await centerBand(page, GALLERY)
    await nextFrames(page)

    const recording = recordActionsBar(page, 60)
    await nextFrames(page)
    await clickPage(page, IMAGES[2]!)
    const frames = await recording

    // The image shown next is registered anew. Until it was measured, the bar
    // was placed at its page alone for a frame or more.
    expect(frames.at(-1)!.selected).toEqual([IMAGES[2]])
    const visible = frames.filter((f) => f.visible).map((f) => f.transform)
    const places = visible.filter((t, i) => t !== visible[i - 1])
    // Where it was, then where it is: nowhere in between.
    expect(places).toEqual([...new Set([visible[0], visible.at(-1)])])
  })

  test('Tab goes from page to page, and on to the block after the field', async () => {
    await show(page, IMAGES[0]!)

    for (const next of [IMAGES[1], IMAGES[2], BETWEEN]) {
      await page.keyboard.press('Tab')
      await expect.poll(() => selectedUuids(page)).toEqual([next])
    }
    expect(await registeredAs(page, IMAGES[2]!)).toBe('block')
  })

  test('a page dropped before the shown one lands at the start', async () => {
    // The shown image's page isn't its element: the drop slots next to it must
    // come from the page, not from the image below the band.
    await show(page, IMAGES[0]!)
    await emitEvent(page, 'select:unselect')
    await centerBand(page, GALLERY)

    const third = (await pageOf(page, IMAGES[2]!).boundingBox())!
    const from = { x: third.x + third.width / 2, y: third.y + third.height / 2 }
    const box = (await pageOf(page, IMAGES[0]!).boundingBox())!
    // The slot before the first page is centred on the start of the list, in
    // its padding before the page.
    const target = { x: box.x - 5, y: box.y + box.height / 2 }

    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    try {
      await page.mouse.move(from.x, from.y + 12, { steps: 4 })
      await page.mouse.move(target.x, target.y, { steps: 12 })
      // The editor ignores a drop in the first 200ms of a drag.
      await page.waitForTimeout(250)
    } finally {
      await page.mouse.up()
    }

    await expect
      .poll(() => fieldUuids(page, FIELD, GALLERY))
      .toEqual([IMAGES[2], IMAGES[0], IMAGES[1]])
  })

  test('the shown page stands in for its block, for clicks and drags', async () => {
    // The block that the field shows renders below the band, so its page isn't
    // its element. Pressing the page must still mean that block, not the
    // gallery holding the field.
    const host = await fieldUuids(page)
    await show(page, IMAGES[1]!)
    await centerBand(page, GALLERY)

    const shown = (await pageOf(page, IMAGES[1]!).boundingBox())!
    const from = { x: shown.x + shown.width / 2, y: shown.y + shown.height / 2 }
    await page.mouse.click(from.x, from.y)
    await expect.poll(() => selectedUuids(page)).toEqual([IMAGES[1]])

    const box = (await pageOf(page, IMAGES[0]!).boundingBox())!
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    try {
      await page.mouse.move(from.x, from.y + 12, { steps: 4 })
      await page.mouse.move(box.x - 5, box.y + box.height / 2, { steps: 12 })
      // The editor ignores a drop in the first 200ms of a drag.
      await page.waitForTimeout(250)
    } finally {
      await page.mouse.up()
    }

    await expect
      .poll(() => fieldUuids(page, FIELD, GALLERY))
      .toEqual([IMAGES[1], IMAGES[0], IMAGES[2]])
    expect(await fieldUuids(page)).toEqual(host)
  })

  test('a copy of the shown image is shown, as a block is after adding', async () => {
    await show(page, IMAGES[0]!)
    const before = await fieldUuids(page, FIELD, GALLERY)

    // An image needs a media, so the add button opens Drupal's form. A copy
    // has the media, and the editor selects it, as it does after adding.
    await clickItemAction(page, 'duplicate')

    let uuid = ''
    await expect
      .poll(async () => {
        const after = await fieldUuids(page, FIELD, GALLERY)
        uuid = after.find((v) => !before.includes(v)) ?? ''
        return uuid
      })
      .not.toBe('')
    await expect.poll(() => registeredAs(page, uuid)).toBe('block')
    expect(await pageOf(page, uuid).getAttribute('data-test-shown')).toBe(
      'true',
    )
  })

  test('deleting the shown image shows the one that took its place', async () => {
    await show(page, IMAGES[1]!)

    await clickItemAction(page, 'delete')

    await expect
      .poll(() => fieldUuids(page, FIELD, GALLERY))
      .toEqual([IMAGES[0], IMAGES[2]])
    await expect.poll(() => registeredAs(page, IMAGES[2]!)).toBe('block')
  })

  test('the pages that do not fit are cut off, and Tab skips them', async () => {
    const pages = band(page, LONG_GALLERY).locator(
      '[data-test="field-pager-page"]',
    )
    await expect.poll(() => pages.count()).toBeGreaterThan(1)
    const count = await pages.count()
    expect(count).toBeLessThan(LONG_IMAGES.length)

    // A block whose page is cut off has no element.
    expect(await registeredAs(page, LONG_IMAGES[count]!)).toBeNull()

    await show(page, LONG_IMAGES[count - 1]!)
    await page.keyboard.press('Tab')
    await expect.poll(() => selectedUuids(page)).toEqual([OUTRO])
  })

  test('Shift+Click selects the pages in between, from the shown one', async () => {
    // Among its siblings, the shown block is where its page is: not the image
    // below the band, which spans the band's whole width.
    await show(page, LONG_IMAGES[0]!)
    await centerBand(page, LONG_GALLERY)

    await clickPage(page, LONG_IMAGES[0]!)
    await expect.poll(() => selectedUuids(page)).toEqual([LONG_IMAGES[0]])
    await clickPage(page, LONG_IMAGES[2]!, 'Shift')

    await expect
      .poll(() => selectedSorted(page))
      .toEqual(LONG_IMAGES.slice(0, 3).sort())
  })

  test('a rectangle over the pages selects their blocks, the shown one too', async () => {
    await show(page, LONG_IMAGES[1]!)
    await emitEvent(page, 'select:unselect')
    await centerBand(page, LONG_GALLERY)

    const first = (await pageOf(page, LONG_IMAGES[0]!).boundingBox())!
    const third = (await pageOf(page, LONG_IMAGES[2]!).boundingBox())!
    // Start left of the gallery, outside every block, and stay in the band.
    const gallery = (await page.evaluate(
      (uuid) =>
        window
          .__BLOKKLI__!.app!.dom.registeredBlocks.value[
            uuid
          ]!.getBoundingClientRect()
          .toJSON(),
      LONG_GALLERY,
    )) as DOMRect
    const start = { x: gallery.x - 20, y: first.y + 10 }

    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    try {
      await page.mouse.move(start.x + 30, start.y + 5, { steps: 5 })
      // The editor ignores a rectangle drawn in less than 175ms.
      await page.waitForTimeout(250)
      await page.mouse.move(
        third.x + third.width / 2,
        third.y + third.height - 10,
        {
          steps: 10,
        },
      )
      await nextFrames(page)
    } finally {
      await page.mouse.up()
    }

    await expect
      .poll(() => selectedSorted(page))
      .toEqual(LONG_IMAGES.slice(0, 3).sort())
  })

  test('Ctrl+Click on the shown page toggles its block', async () => {
    await show(page, LONG_IMAGES[0]!)
    await centerBand(page, LONG_GALLERY)

    await clickPage(page, LONG_IMAGES[0]!)
    await clickPage(page, LONG_IMAGES[2]!, 'Control')
    await expect
      .poll(() => selectedSorted(page))
      .toEqual([LONG_IMAGES[0]!, LONG_IMAGES[2]!].sort())

    await clickPage(page, LONG_IMAGES[0]!, 'Control')
    await expect.poll(() => selectedUuids(page)).toEqual([LONG_IMAGES[2]])
  })

  test('selecting an image in the structure shows it', async () => {
    await show(page, IMAGES[0]!)
    await emitEvent(page, 'select:unselect')

    await openSidebar(page, 'structure')
    await page
      .locator(`[data-test="structure-item"][data-test-uuid="${IMAGES[2]}"]`)
      .click()

    await expect.poll(() => registeredAs(page, IMAGES[2]!)).toBe('block')
  })

  test('selecting an image that is cut off shows it and scrolls to it', async () => {
    const last = LONG_IMAGES[LONG_IMAGES.length - 1]!
    await show(page, LONG_IMAGES[0]!)
    await emitEvent(page, 'select:unselect')
    expect(await registeredAs(page, last)).toBeNull()

    // The structure selects it and scrolls to it right away, while it has no
    // element yet.
    await openSidebar(page, 'structure')
    await page
      .locator(`[data-test="structure-item"][data-test-uuid="${last}"]`)
      .click()

    await expect.poll(() => registeredAs(page, last)).toBe('block')
    expect(
      await band(page, LONG_GALLERY)
        .locator('[data-test="field-pager-count"]')
        .textContent(),
    ).toContain(String(LONG_IMAGES.length))
    await expect
      .poll(async () => {
        const rect = await blockViewportRect(page, last)
        const viewport = page.viewportSize()!
        return !!rect && rect.y < viewport.height && rect.y + rect.height > 0
      })
      .toBe(true)
  })

  test('the Structure view shows proxies instead of the band', async () => {
    await openViewOptions(page)
    await viewOption(page, 'proxy_view').click()
    await expect
      .poll(() => page.locator('[data-test="field-pager"]').count())
      .toBe(0)
    await expect.poll(() => registeredAs(page, IMAGES[1]!)).toBe('block')

    await viewOption(page, 'proxy_view').click()
    await closeViewOptions(page)
    await expect
      .poll(() => page.locator('[data-test="field-pager"]').count())
      .toBe(2)
  })
})
