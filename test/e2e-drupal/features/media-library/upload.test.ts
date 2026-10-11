import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import {
  dialogSubmit,
  dismissMessages,
  messageTexts,
} from '../../support/overlays'
import { openSidebar } from '../../support/sidebar'
import { blockCount } from '../../support/blocks'
import {
  dropFiles,
  pickFiles,
  uploadDialog,
  uploadStatuses,
  type TestFile,
} from '../../support/uploads'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * The media library's upload button, and files dropped on the library: the
 * files are uploaded in the upload dialog (see `clipboard/upload.test.ts`),
 * which creates their media without adding blocks. The library then lists them
 * first: Drupal sorts it by the newest. That a user who may not create media
 * has no button is in `clipboard/files.test.ts`, which has such a user's page.
 */

/** Pick the files with the library's upload button. */
function pick(page: Page, files: TestFile[]): Promise<void> {
  return pickFiles(page, 'media-library-upload-input', files)
}

/** The labels of the library's media, in order. */
function libraryLabels(page: Page): Promise<string[]> {
  return page
    .locator('[data-test="media-library-item"]')
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-test-label') ?? ''),
    )
}

/** Whether a message names the file. */
async function hasMessageFor(page: Page, fileName: string): Promise<boolean> {
  const texts = await messageTexts(page)
  return texts.some((text) => text.includes(fileName))
}

/**
 * Page lifecycle: one editor page shared, on the page "Blocks", with the media
 * library open. `afterEach` cancels a dialog still open.
 */
describe('Uploading files to the media library', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    await openSidebar(page, 'media_library')
    await page.locator('[data-test="media-library"]').waitFor()
    // The seeded media: the library loads them after it opened.
    await page.locator('[data-test="media-library-item"]').first().waitFor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await uploadDialog(page).count()) {
      await uploadDialog(page).locator('[data-test="dialog-cancel"]').click()
      await uploadDialog(page).waitFor({ state: 'detached' })
    }
    await dismissMessages(page)
  })

  test('a file Drupal would refuse is refused before it is uploaded', async () => {
    await pick(page, [
      { name: 'photo.png', type: 'image/png' },
      { name: 'setup.exe', type: 'application/octet-stream' },
    ])

    await expect.poll(() => hasMessageFor(page, 'setup.exe')).toBe(true)
    expect(await uploadDialog(page).count()).toBe(0)
  })

  test('picked files become media, which the library lists first', async () => {
    const before = await libraryLabels(page)
    await pick(page, [
      { name: 'harbour.png', type: 'image/png' },
      { name: 'minutes.pdf', type: 'application/pdf' },
    ])

    await expect
      .poll(() => uploadStatuses(page))
      .toEqual(['uploaded', 'uploaded'])
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    // The newest first: the files' media, in the order they were created.
    await expect
      .poll(async () => (await libraryLabels(page)).slice(0, 2))
      .toEqual(['minutes.pdf', 'harbour.png'])
    expect((await libraryLabels(page))[2]).toBe(before[0])
  })

  test('files dropped on the library become media, not blocks', async () => {
    const blocks = await blockCount(page)
    await dropFiles(page, 'media-library', [
      { name: 'quay.png', type: 'image/png' },
    ])

    await expect.poll(() => uploadStatuses(page)).toEqual(['uploaded'])
    await dialogSubmit(page).click()
    await uploadDialog(page).waitFor({ state: 'detached' })

    await expect
      .poll(async () => (await libraryLabels(page))[0])
      .toBe('quay.png')
    // Dropped anywhere else, the file would be the page's: a new block.
    expect(await blockCount(page)).toBe(blocks)
  })
})
