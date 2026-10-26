import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  editorPath,
  openEditor,
  revertAllChanges,
  withApp,
} from '../../support/session'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { blockState } from '../../support/blocks'
import { emitEvent, nextEvent } from '../../support/events'
import { countMutations, nextMutation } from '../../support/mutations'
import { dialogSubmit, dismissMessages } from '../../support/overlays'
import {
  answerDropLanguages,
  dropAreaIds,
  dropLanguages,
  dropOnArea,
  mediaLibraryItem,
  pointerToCenter,
  searchContentItem,
  startDrag,
  type DragItem,
} from '../../support/dropAreas'
import {
  pasteFiles,
  uploadDialog,
  uploadField,
  uploadStatuses,
} from '../../support/uploads'

const TEASER = seedUuid('paragraph', 'drops-teaser')
const UNTRANSLATED = seedUuid('paragraph', 'drops-untranslated')
const IMAGE = seedUuid('paragraph', 'drops-image')
const NEWS = seedUuid('node', 'drops')

/** The image media's alt text, in the upload dialog's form. */
const ALT = 'field_media_image[0][alt]'

function isDragging(page: Page): Promise<boolean> {
  return withApp(page, (app) => app.selection.isDragging.value)
}

/**
 * The derivative of a teaser's image. The media's file names tell them apart:
 * "The lake" is lake.jpg, "The hills" hills.jpg.
 */
async function teaserImage(page: Page, uuid: string): Promise<string> {
  const { props } = await blockState(page, uuid)
  return props?.image?.image?.derivative?.urlPath ?? ''
}

/**
 * Dropping a media or a search result onto a field that differs per language
 * asks whether to change it in all languages (blokkli_playground_test makes a
 * teaser's link and media and a news item's hero image translatable).
 *
 * Page lifecycle: the news "Drops" in English, where the drops happen, and in
 * German, which reloads its state to show what Drupal stored. Each test
 * discards its changes.
 */
describe('Drops onto fields that differ per language', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let german: Page
  let hills: DragItem

  /** Drag an item and drop it on an area, as a pointer does. */
  async function drop(item: DragItem, area: string): Promise<void> {
    await startDrag(page, item)
    await expect.poll(() => dropAreaIds(page)).toContain(area)
    await dropOnArea(page, area)
    // A pointer's drop ends the drag right away.
    await emitEvent(page, 'dragging:end')
  }

  /** What the German translation shows, once its state is reloaded. */
  async function inGerman<T>(read: (page: Page) => Promise<T>): Promise<T> {
    const reloaded = nextEvent(german, 'state:reloaded')
    await emitEvent(german, 'reloadState')
    await reloaded
    return read(german)
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/news/drops', 'drops'),
    )
    german = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/de/aktuelles/ablagen', 'drops'),
    )
    hills = await mediaLibraryItem(page, 'The hills')
  })

  afterAll(async () => {
    await german.close()
    await page.close()
  })

  afterEach(async () => {
    if ((await dropLanguages(page).count()) > 0) {
      await dropLanguages(page)
        .locator('[data-test="artboard-tooltip-close"]')
        .click()
      await dropLanguages(page).waitFor({ state: 'detached' })
    }
    if (await isDragging(page)) {
      await emitEvent(page, 'dragging:end')
    }
    if ((await uploadDialog(page).count()) > 0) {
      await emitEvent(page, 'overlay:close')
    }
    await dismissMessages(page)
    await revertAllChanges(page)
  })

  test('"All languages" replaces the media in every translation', async () => {
    await drop(hills, `replace-media:${TEASER}:field_media`)
    await dropLanguages(page).waitFor()
    expect(
      await dropLanguages(page)
        .locator('[data-test="drop-languages-source"]')
        .getAttribute('data-test-language'),
    ).toBe('en')

    const variables = nextMutation(page, 'pbReplaceMedia')
    await answerDropLanguages(page, 'all')
    expect(await variables).toMatchObject({
      uuid: TEASER,
      fieldName: 'field_media',
      allLanguages: true,
    })
    await expect.poll(() => teaserImage(page, TEASER)).toContain('hills')
    expect(await inGerman((page) => teaserImage(page, TEASER))).toContain(
      'hills',
    )
  })

  test('"Only English" keeps the media of the translations', async () => {
    await drop(hills, `replace-media:${TEASER}:field_media`)
    const variables = nextMutation(page, 'pbReplaceMedia')
    await answerDropLanguages(page, 'source')
    expect(await variables).toMatchObject({ allLanguages: false })
    await expect.poll(() => teaserImage(page, TEASER)).toContain('hills')
    expect(await inGerman((page) => teaserImage(page, TEASER))).toContain(
      'lake',
    )
  })

  test('closing the question cancels the drop', async () => {
    const replaced = countMutations(page, 'pbReplaceMedia')
    await drop(hills, `replace-media:${TEASER}:field_media`)
    await dropLanguages(page).waitFor()
    await dropLanguages(page)
      .locator('[data-test="artboard-tooltip-close"]')
      .click()
    await dropLanguages(page).waitFor({ state: 'detached' })
    expect(await isDragging(page)).toBe(false)
    expect(replaced()).toBe(0)
  })

  test('no question without another translation or for a shared field', async () => {
    for (const uuid of [UNTRANSLATED, IMAGE]) {
      const variables = nextMutation(
        page,
        'pbReplaceMedia',
        (v) => v.uuid === uuid,
      )
      await drop(hills, `replace-media:${uuid}:field_media`)
      const sent = await variables
      expect(sent.allLanguages).toBeUndefined()
      expect(await dropLanguages(page).count()).toBe(0)
    }
  })

  test("the page's hero image", async () => {
    await drop(hills, `replace-entity-media:${NEWS}:field_hero_image`)
    const variables = nextMutation(page, 'pbReplaceHostEntityMedia')
    await answerDropLanguages(page, 'all')
    expect(await variables).toMatchObject({
      fieldName: 'field_hero_image',
      allLanguages: true,
    })
  })

  test("a search result on a teaser's link", async () => {
    const before = await inGerman(
      async (page) => (await blockState(page, TEASER)).props?.link?.uri?.path,
    )
    const links = await searchContentItem(page, 'Links')
    await drop(links, `replace-search-content:${TEASER}:field_link`)
    const variables = nextMutation(page, 'pbReplaceEntityReference')
    await answerDropLanguages(page, 'all')
    expect(await variables).toMatchObject({
      uuid: TEASER,
      fieldName: 'field_link',
      allLanguages: true,
    })
    expect(
      await inGerman(
        async (page) => (await blockState(page, TEASER)).props?.link?.uri?.path,
      ),
    ).not.toBe(before)
  })

  test('a pasted file asks before the upload dialog opens', async () => {
    await pointerToCenter(page)
    await pasteFiles(page, [{ name: 'new.png', type: 'image/png' }])
    await expect.poll(() => isDragging(page)).toBe(true)
    await dropOnArea(page, `replace-media:${TEASER}:field_media`)
    await emitEvent(page, 'dragging:end')
    await dropLanguages(page).waitFor()
    expect(await uploadDialog(page).count()).toBe(0)

    await answerDropLanguages(page, 'all')
    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    await uploadField(page, ALT).fill('New')
    await uploadField(page, ALT).blur()
    const variables = nextMutation(page, 'pbReplaceMedia')
    await dialogSubmit(page).click()
    expect(await variables).toMatchObject({
      uuid: TEASER,
      allLanguages: true,
    })
    await uploadDialog(page).waitFor({ state: 'detached' })
  })
})
