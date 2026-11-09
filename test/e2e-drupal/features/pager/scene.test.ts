import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { addBlock, nextFrames, selectBlock } from '../../support/blocks'
import {
  editableOverlay,
  plaintextEditor,
  saveByClickAway,
} from '../../support/editable'
import { emitEvent, nextEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import {
  band,
  centerBand,
  clickPage,
  registeredAs,
  show,
} from '../../support/pager'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { selectedUuids } from '../../support/selection'
import {
  editorPath,
  openEditor,
  revertAllChanges,
  withApp,
} from '../../support/session'

/**
 * A field in proxy mode whose slot renders the shown block itself
 * (`proxy-mode="slot"`): the sandbox's story (Paragraph/Story). While editing,
 * its band of pages is above the story's own layout, which shows one section.
 * The markup that the story wraps in the section's <BlokkliItem> is the
 * section's element, edited in place; every other section renders as on the
 * site, and its page stands in for it.
 *
 * On content/nodes/story.yml: a text; a story in the split layout (a teaser, an
 * accordion holding a text and a gallery as a slider, an image); a story in the
 * images layout (two images and a teaser, which the layout can't show); a
 * text.
 */

const STORY_EDITOR_PATH = editorPath('/en/story', 'story')
const SPLIT = seedUuid('paragraph', 'story-split')
const TEASER = seedUuid('paragraph', 'story-teaser')
const ACCORDION = seedUuid('paragraph', 'story-accordion')
const ACCORDION_TEXT = seedUuid('paragraph', 'story-accordion-text')
const ACCORDION_GALLERY = seedUuid('paragraph', 'story-accordion-gallery')
const ACCORDION_IMAGES = [1, 2].map((i) =>
  seedUuid('paragraph', `story-accordion-image-${i}`),
)
const IMAGE = seedUuid('paragraph', 'story-image')
const PICTURES_STORY = seedUuid('paragraph', 'story-images')
const PICTURES = [1, 2].map((i) => seedUuid('paragraph', `story-images-${i}`))
const PICTURES_TEASER = seedUuid('paragraph', 'story-images-teaser')

/** A section as the story renders it. */
function section(page: Page, uuid: string): Locator {
  return page.locator(`[data-test="story-section"][data-test-uuid="${uuid}"]`)
}

/** Whether the editor registered the story's markup of a section as its element. */
function registeredAsSection(page: Page, uuid: string): Promise<boolean> {
  return page.evaluate((uuid) => {
    const element = window.__BLOKKLI__!.app!.dom.registeredBlocks.value[uuid]
    return !!element?.matches(
      `[data-test="story-section"][data-test-uuid="${uuid}"]`,
    )
  }, uuid)
}

/** The fields of a block with an editable registered for them. */
function editableFields(page: Page, uuid: string): Promise<string[]> {
  return page.evaluate(
    (uuid) =>
      window
        .__BLOKKLI__!.app!.directive.getEditablesForBlock(uuid)
        .map((editable) => editable.fieldName)
        .sort(),
    uuid,
  )
}

/** Scroll a block into the middle of the viewport. */
async function scrollTo(page: Page, uuid: string): Promise<void> {
  await emitEvent(page, 'scrollIntoView', {
    uuid,
    immediate: true,
    center: true,
  })
  await nextFrames(page)
}

/**
 * Double-click the middle of an element with the real pointer, once the editor
 * has scrolled it into the middle of the viewport: a section of the story can
 * be wider than the viewport.
 */
async function doubleClick(page: Page, locator: Locator): Promise<void> {
  await locator.evaluate((el) => {
    const app = window.__BLOKKLI__!.app!
    const rect = app.ui.getAbsoluteElementRect(el as HTMLElement)
    app.eventBus.emit('scrollIntoView', { rect, immediate: true, center: true })
  })
  await nextFrames(page)
  const box = (await locator.boundingBox())!
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2)
}

/**
 * Page lifecycle: one editor page. Every test shows the sections it needs
 * first: the stories keep showing what they showed last. `afterEach` discards
 * the changes of the tests that edit or add.
 */
describe('A field in proxy mode whose slot renders the shown block', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', STORY_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // An inline editor still open: unchanged, it saves nothing.
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
    await emitEvent(page, 'select:unselect')
    if (await withApp(page, (app) => app.state.mutations.value.length)) {
      await revertAllChanges(page)
    }
  })

  test("renders the story's layout below the band, the shown section as its block", async () => {
    await show(page, TEASER)
    expect(await registeredAsSection(page, TEASER)).toBe(true)
    expect(await registeredAs(page, ACCORDION)).toBe('page')
    expect(await registeredAs(page, IMAGE)).toBe('page')

    // The split layout shows one section while editing.
    expect(await section(page, ACCORDION).count()).toBe(0)
    const bandBox = (await band(page, SPLIT).boundingBox())!
    const sectionBox = (await section(page, TEASER).boundingBox())!
    expect(sectionBox.y).toBeGreaterThanOrEqual(bandBox.y + bandBox.height)

    // The section's markup is in the story's template, as the story's title
    // is: each edits its own block.
    expect(await editableFields(page, TEASER)).toEqual([
      'field_lead',
      'field_title',
    ])
    expect(await editableFields(page, SPLIT)).toEqual(['field_title'])
  })

  test("pressing the section's visual selects the section", async () => {
    await show(page, TEASER)
    await emitEvent(page, 'select:unselect')
    await scrollTo(page, TEASER)

    // The image on the left: one <BlokkliItem> holds both halves.
    const box = (await section(page, TEASER).boundingBox())!
    await page.mouse.click(box.x + box.width / 4, box.y + box.height / 2)
    await expect.poll(() => selectedUuids(page)).toEqual([TEASER])
  })

  test('clicking a page shows its section in the story', async () => {
    await show(page, TEASER)
    await centerBand(page, SPLIT)
    await clickPage(page, IMAGE)

    await expect.poll(() => selectedUuids(page)).toEqual([IMAGE])
    await expect.poll(() => registeredAsSection(page, IMAGE)).toBe(true)
    expect(await registeredAs(page, TEASER)).toBe('page')
    expect(await section(page, TEASER).count()).toBe(0)
  })

  test("a section's title edited in the story is stored, and shows", async () => {
    await show(page, TEASER)

    const opened = nextEvent(page, 'editable:open')
    await doubleClick(page, section(page, TEASER).locator('h3'))
    expect(await opened).toMatchObject({
      fieldName: 'field_title',
      uuid: TEASER,
    })

    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    await editor.fill('A new title')
    const saved = nextMutation(page, 'pbUpdateFieldValue')
    await saveByClickAway(page)
    await editableOverlay(page).waitFor({ state: 'detached' })

    expect(await saved).toMatchObject({
      uuid: TEASER,
      fieldName: 'field_title',
      value: 'A new title',
    })
    await expect
      .poll(() => section(page, TEASER).locator('h3').textContent())
      .toContain('A new title')
  })

  test("the story's own title, in the same template, edits the story", async () => {
    await show(page, TEASER)
    // Without the actions bar of the section, which sits above the band.
    await emitEvent(page, 'select:unselect')

    const opened = nextEvent(page, 'editable:open')
    await doubleClick(
      page,
      page.locator(`[data-bk-uuid="${SPLIT}"] h2`).first(),
    )
    expect(await opened).toMatchObject({
      fieldName: 'field_title',
      uuid: SPLIT,
    })
  })

  test("the sections that aren't shown register no editables", async () => {
    // The images layout renders both pictures and hides the one not shown.
    await show(page, PICTURES[0]!)
    expect(await editableFields(page, PICTURES[0]!)).toEqual(['field_caption'])
    expect(await editableFields(page, PICTURES[1]!)).toEqual([])
  })

  test("Tab goes through the accordion's blocks, then on to the next section", async () => {
    await show(page, ACCORDION)

    // The accordion's markup in the story follows its page: its blocks come
    // before the next page.
    for (const next of [
      ACCORDION_TEXT,
      ACCORDION_GALLERY,
      ACCORDION_IMAGES[0],
      ACCORDION_IMAGES[1],
      IMAGE,
    ]) {
      await page.keyboard.press('Tab')
      await expect.poll(() => selectedUuids(page)).toEqual([next])
    }
  })

  test('a block added to the shown accordion renders in the story', async () => {
    await show(page, ACCORDION)
    const uuid = await addBlock(page, { bundle: 'text', hostUuid: ACCORDION })
    expect(uuid).toBeTruthy()

    await expect
      .poll(() =>
        section(page, ACCORDION).locator(`[data-bk-uuid="${uuid}"]`).count(),
      )
      .toBe(1)
    await expect.poll(() => registeredAs(page, uuid!)).toBe('block')
  })

  test('selecting a block in an accordion that is not shown shows it', async () => {
    await show(page, TEASER)
    await selectBlock(page, ACCORDION_TEXT)

    await expect.poll(() => registeredAsSection(page, ACCORDION)).toBe(true)
    await expect.poll(() => registeredAs(page, ACCORDION_TEXT)).toBe('block')
  })

  test("the images layout shows a teaser, which it can't show, as its type does", async () => {
    await show(page, PICTURES_TEASER)

    expect(await registeredAsSection(page, PICTURES_TEASER)).toBe(false)
    const inStory = await page.evaluate(
      (uuid) =>
        !!window.__BLOKKLI__!.app!.dom.registeredBlocks.value[uuid]?.closest(
          '[data-test="story-scene"][data-test-layout="images"]',
        ),
      PICTURES_TEASER,
    )
    expect(inStory).toBe(true)
    expect(await section(page, PICTURES[0]!).isVisible()).toBe(false)
  })

  test('the pictures, all rendered, switch between the block and as on the site', async () => {
    await show(page, PICTURES[0]!)
    expect(await registeredAs(page, PICTURES[1]!)).toBe('page')
    expect(await section(page, PICTURES[1]!).isVisible()).toBe(false)

    await centerBand(page, PICTURES_STORY)
    await clickPage(page, PICTURES[1]!)

    await expect.poll(() => registeredAsSection(page, PICTURES[1]!)).toBe(true)
    expect(await registeredAs(page, PICTURES[0]!)).toBe('page')
    expect(await section(page, PICTURES[0]!).isVisible()).toBe(false)
    expect(await section(page, PICTURES[1]!).isVisible()).toBe(true)
    expect(await editableFields(page, PICTURES[1]!)).toEqual(['field_caption'])
    expect(await editableFields(page, PICTURES[0]!)).toEqual([])
  })
})
