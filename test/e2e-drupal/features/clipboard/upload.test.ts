import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { blockCount, blockState } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { dispatchPaste, dropDragInto } from '../../support/clipboard'
import { dialogSubmit, dismissMessages } from '../../support/overlays'
import {
  dropAreaIds,
  dropOnArea,
  pasteFiles,
  uploadDialog,
  uploadField,
  uploadStatuses,
  type TestFile,
} from '../../support/uploads'
import { topLevelBlockUuids } from '../../support/selection'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * Pasted files are uploaded in a dialog, where their media's fields are filled
 * in: Drupal's upload route (with the session's token), the media's form
 * (described by Drupal), the media created in one request, then the blocks
 * added in one mutation. Images become `image` paragraphs, documents `link`
 * ones. The files are built in the page (`support/uploads.ts`).
 */

/**
 * Paste the files and drop them in the page's paragraphs, as a pointer does:
 * the drag ends with the drop, before the dialog closes.
 */
async function pasteAndDrop(
  page: Page,
  files: TestFile[],
  preceedingUuid: string | null = null,
): Promise<void> {
  await pasteFiles(page, files)
  await expect.poll(() => isDragging(page)).toBe(true)
  await dropDragInto(page, { fieldName: 'field_paragraphs', preceedingUuid })
  await emitEvent(page, 'dragging:end')
}

function isDragging(page: Page): Promise<boolean> {
  return withApp(page, (app) => app.selection.isDragging.value)
}

/** The image media's alt text and credit, in the dialog's forms. */
const ALT = 'field_media_image[0][alt]'
const CREDIT = 'field_credit[0][value]'

/** The alt texts of the images of the blocks added since `before`. */
async function addedAlts(page: Page, before: string[]): Promise<string[]> {
  const uuids = await withApp(page, (app) => app.state.getAllUuids())
  return Promise.all(
    uuids
      .filter((uuid) => !before.includes(uuid))
      .map(
        async (uuid) =>
          (await blockState(page, uuid)).props?.media?.image?.alt ?? '',
      ),
  )
}

/**
 * Page lifecycle: one editor page shared, on the page "Blocks". Each test
 * pastes once and finds the blocks it added by their uuids; `afterEach`
 * cancels a dialog still open.
 */
describe('Uploading pasted files', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await uploadDialog(page).count()) {
      await uploadDialog(page).locator('[data-test="dialog-cancel"]').click()
      await uploadDialog(page).waitFor({ state: 'detached' })
    }
    if (await isDragging(page)) {
      await emitEvent(page, 'dragging:end')
    }
    await dismissMessages(page)
  })

  test('a pasted image is added with the alt text filled in', async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    // A header can't carry the name as it is.
    await pasteAndDrop(page, [{ name: 'Mačka.png', type: 'image/png' }])

    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    // The media's name, its file's name unless changed.
    const name = uploadField(page, 'name[0][value]')
    expect(await name.inputValue()).toBe('Mačka.png')
    const alt = uploadField(page, ALT)
    await alt.fill('A cat')
    await alt.blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect.poll(() => blockCount(page)).toBe(before.length + 1)
    const uuid = (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !before.includes(uuid),
    )!
    const info = await blockState(page, uuid)
    expect(info.bundle).toBe('image')
    expect(info.props?.media?.image?.alt).toBe('A cat')
  })

  test("the image's focal point is set on its preview, and saved with the media", async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    await pasteAndDrop(page, [{ name: 'focus.png', type: 'image/png' }])

    const focalPoint = uploadDialog(page).locator(
      '[data-test="upload-focal-point"]',
    )
    await focalPoint.waitFor()
    expect(await focalPoint.getAttribute('data-test-value')).toBe('50,50')
    const box = (await focalPoint.boundingBox())!
    await focalPoint.click({
      position: { x: box.width * 0.25, y: box.height * 0.6 },
    })
    expect(await focalPoint.getAttribute('data-test-value')).toBe('25,60')
    await page.keyboard.press('Shift+ArrowRight')
    expect(await focalPoint.getAttribute('data-test-value')).toBe('35,60')
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect.poll(() => blockCount(page)).toBe(before.length + 1)
    const uuid = (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !before.includes(uuid),
    )!
    // Drupal keeps it in pixels: the image is 40 by 30, so these survive.
    const info = await blockState(page, uuid)
    expect(info.props?.media?.image?.focalPoint).toEqual({ x: 35, y: 60 })
  })

  test("Drupal's error shows at its field, and the file is added once it's fixed", async () => {
    const before = await blockCount(page)
    await pasteAndDrop(page, [{ name: 'credit.png', type: 'image/png' }])

    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    const credit = uploadDialog(page).locator(
      '[data-test="config-form-field_credit[0][value]"]',
    )
    const input = credit.locator('[data-test="form-text-input"]')
    // Typed, a value stays within the field's maximum length; set past it,
    // Drupal refuses it at the field.
    await input.evaluate((el: HTMLInputElement) => {
      el.value = 'x'.repeat(300)
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await dialogSubmit(page).click()
    await credit.locator('[data-test="config-form-error"]').waitFor()
    expect(await uploadStatuses(page)).toEqual(['uploaded'])

    await input.fill('Jane Doe')
    await input.blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before + 1)
  })

  test('a file Drupal refuses can be removed, and the others are added', async () => {
    const before = await blockCount(page)
    await pasteAndDrop(page, [
      { name: 'photo.png', type: 'image/png' },
      { name: 'broken.png', type: 'image/png', broken: true },
    ])

    await expect
      .poll(() => uploadStatuses(page))
      .toEqual(['uploaded', 'failed'])
    expect(await dialogSubmit(page).isDisabled()).toBe(true)
    await uploadDialog(page).locator('[data-test="upload-remove"]').click()
    expect(await uploadStatuses(page)).toEqual(['uploaded'])

    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before + 1)
  })

  test('an image and a PDF are added as an image and a link, in order', async () => {
    const before = await topLevelBlockUuids(page)
    await pasteAndDrop(
      page,
      [
        { name: 'photo.png', type: 'image/png' },
        { name: 'report.pdf', type: 'application/pdf' },
      ],
      before[0],
    )

    await expect
      .poll(() => uploadStatuses(page))
      .toEqual(['uploaded', 'uploaded'])
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect.poll(() => blockCount(page)).toBe(before.length + 2)
    const after = await topLevelBlockUuids(page)
    // After the first paragraph, where they were dropped.
    expect(after[0]).toBe(before[0])
    const bundles = await Promise.all(
      after
        .slice(1, 3)
        .map(async (uuid) => (await blockState(page, uuid)).bundle),
    )
    expect(bundles).toEqual(['image', 'link'])
  })

  test("a field's value is applied to the other files", async () => {
    const before = await blockCount(page)
    await pasteAndDrop(page, [
      { name: 'one.png', type: 'image/png' },
      { name: 'two.png', type: 'image/png' },
    ])

    await expect
      .poll(() => uploadStatuses(page))
      .toEqual(['uploaded', 'uploaded'])
    const apply = uploadDialog(page)
      .locator(`[data-test="config-form-${CREDIT}"]`)
      .first()
      .locator('[data-test="upload-apply-to-all"]')
    // Without a value, there's nothing to apply.
    expect(await apply.isVisible()).toBe(false)
    const credits = uploadField(page, CREDIT)
    await credits.first().fill('Jane Doe')
    await credits.first().blur()
    await apply.click()
    expect(await credits.nth(1).inputValue()).toBe('Jane Doe')

    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before + 2)
  })

  test('a field a form shows while a checkbox is ticked is required then', async () => {
    const before = await blockCount(page)
    await pasteAndDrop(page, [{ name: 'licensed.png', type: 'image/png' }])
    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])

    // The site's hook (`MediaFormHooks`) sets the licence's "#states".
    const licence = uploadField(page, 'blokkli_playground_licence')
    expect(await licence.count()).toBe(0)
    expect(await dialogSubmit(page).isDisabled()).toBe(false)

    await uploadDialog(page)
      .locator(
        '[data-test="config-form-blokkli_playground_licensed"] [data-test="form-toggle-input"]',
      )
      .evaluate((input: HTMLInputElement) => input.click())
    await licence.waitFor()
    expect(await dialogSubmit(page).isDisabled()).toBe(true)

    await licence.fill('CC BY 4.0')
    await licence.blur()
    await expect.poll(() => dialogSubmit(page).isDisabled()).toBe(false)
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before + 1)
  })

  test("an image dropped on a block's image replaces it", async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    await pasteAndDrop(page, [{ name: 'old.png', type: 'image/png' }])
    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    await uploadField(page, ALT).fill('Old')
    await uploadField(page, ALT).blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before.length + 1)
    const uuid = (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !before.includes(uuid),
    )!
    const area = `replace-media:${uuid}:field_media`

    // A document can't replace an image.
    await pasteFiles(page, [{ name: 'report.pdf', type: 'application/pdf' }])
    await expect.poll(() => isDragging(page)).toBe(true)
    expect(await dropAreaIds(page)).not.toContain(area)
    await emitEvent(page, 'dragging:end')

    await pasteFiles(page, [{ name: 'new.png', type: 'image/png' }])
    await expect.poll(() => isDragging(page)).toBe(true)
    expect(await dropAreaIds(page)).toContain(area)
    await dropOnArea(page, area)
    await emitEvent(page, 'dragging:end')

    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    await uploadField(page, ALT).fill('New')
    await uploadField(page, ALT).blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect
      .poll(async () => (await blockState(page, uuid)).props?.media?.image?.alt)
      .toBe('New')
    expect(await blockCount(page)).toBe(before.length + 1)
  })

  test('a file that a media already has is not uploaded again', async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    const color = 'rgb(20 120 220)'
    await pasteAndDrop(page, [{ name: 'lake.png', type: 'image/png', color }])
    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    await uploadField(page, ALT).fill('A lake')
    await uploadField(page, ALT).blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })
    await expect.poll(() => blockCount(page)).toBe(before.length + 1)

    // The same content under another name: Drupal answers with the media.
    await pasteAndDrop(page, [{ name: 'copy.png', type: 'image/png', color }])
    const duplicate = uploadDialog(page).locator(
      '[data-test="upload-duplicate"]',
    )
    await duplicate.waitFor()
    expect(await duplicate.getAttribute('data-test-label')).toBe('lake.png')
    // Nothing to fill in: the media has its values.
    expect(await uploadField(page, ALT).count()).toBe(0)
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect.poll(() => blockCount(page)).toBe(before.length + 2)
    expect(await addedAlts(page, before)).toEqual(['A lake', 'A lake'])
  })

  test('two files of the same content become one media', async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    const color = 'rgb(220 60 20)'
    await pasteAndDrop(page, [
      { name: 'one.png', type: 'image/png', color },
      { name: 'two.png', type: 'image/png', color },
    ])

    // Neither is a media's file while they're uploaded.
    await expect
      .poll(() => uploadStatuses(page))
      .toEqual(['uploaded', 'uploaded'])
    const alts = uploadField(page, ALT)
    await alts.first().fill('One')
    await alts.first().blur()
    await alts.nth(1).fill('Two')
    await alts.nth(1).blur()
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    // The second file gets the first one's media, so its values are left out.
    await expect.poll(() => blockCount(page)).toBe(before.length + 2)
    expect(await addedAlts(page, before)).toEqual(['One', 'One'])
  })

  test('cancelling adds nothing', async () => {
    const before = await blockCount(page)
    await pasteAndDrop(page, [{ name: 'dog.png', type: 'image/png' }])

    await uploadDialog(page).waitFor()
    // No paste while the dialog is open.
    await dispatchPaste(page, 'pasted text')
    expect(await isDragging(page)).toBe(false)
    await uploadDialog(page).locator('[data-test="dialog-cancel"]').click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    expect(await blockCount(page)).toBe(before)
  })

  test('the upload route refuses an upload without the token', async () => {
    const status = await page.evaluate(async () => {
      const response = await fetch(
        '/paragraphs_blokkli/upload/image?_format=json',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'file; filename="cat.png"',
          },
          body: new Blob(['x']),
        },
      )
      return response.status
    })
    expect(status).toBe(403)
  })
})
