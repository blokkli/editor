import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { blockCount, blockState } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import { dispatchPaste, dropDragInto } from '../../support/clipboard'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { topLevelBlockUuids } from '../../support/selection'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * Pasted files are uploaded in a dialog, where their media's fields are filled
 * in: Drupal's upload route (with the session's token), the media's form
 * (described by Drupal), the media created in one request, then the blocks
 * added in one mutation. Images become `image` paragraphs, documents `link`
 * ones. The files are built in the page: images drawn on a canvas, so Drupal
 * takes them as images, each of another colour, so none is a duplicate. A
 * broken one is zeros, which Drupal refuses.
 */

/** A file to paste. */
type TestFile = { name: string; type: string; broken?: boolean }

/**
 * Dispatch a synthetic `paste` carrying files built in the page.
 */
function pasteFiles(page: Page, files: TestFile[]): Promise<void> {
  return page.evaluate(async (files) => {
    const dt = new DataTransfer()
    for (const { name, type, broken } of files) {
      let blob: Blob
      if (broken) {
        blob = new Blob([new Uint8Array(64)], { type })
      } else if (type.startsWith('image/')) {
        const canvas = document.createElement('canvas')
        canvas.width = 40
        canvas.height = 30
        const context = canvas.getContext('2d')!
        context.fillStyle = `hsl(${Math.random() * 360} 80% 50%)`
        context.fillRect(0, 0, 40, 30)
        blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((v) => resolve(v!), type),
        )
      } else {
        blob = new Blob([`%PDF-1.4 ${Math.random()}`], { type })
      }
      dt.items.add(new File([blob], name, { type }))
    }
    document.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, files)
}

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

function uploadDialog(page: Page) {
  return dialog(page, 'clipboard-upload')
}

/** The status of each file in the dialog. */
function uploadStatuses(page: Page): Promise<string[]> {
  return uploadDialog(page)
    .locator('[data-test="clipboard-upload-item"]')
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-test-status') ?? ''),
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
    const name = uploadDialog(page).locator(
      '[data-test="config-form-name[0][value]"] [data-test="form-text-input"]',
    )
    expect(await name.inputValue()).toBe('Mačka.png')
    const alt = uploadDialog(page).locator(
      '[data-test="config-form-field_media_image[0][alt]"] [data-test="form-text-input"]',
    )
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
    await uploadDialog(page)
      .locator('[data-test="clipboard-upload-remove"]')
      .click()
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
