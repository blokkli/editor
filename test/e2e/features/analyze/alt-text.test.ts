import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { dismissMessages } from './../../support/overlays'
import { setupEditorE2E } from './../../support/setup'
import {
  EDITOR_PATH_EMPTY,
  openEditor,
  resetMockState,
} from './../../support/session'
import {
  analyzeResult,
  openAnalyzeSection,
  openSidebar,
} from './../../support/sidebar'
import { emitEvent } from './../../support/events'

/**
 * The built-in `blokkli:image-alt-text` analyzer (registered by the
 * playground adapter) reports every `<img>` without a non-empty `alt`.
 *
 * Runs on the empty page, which renders no image at all, so the baseline is a
 * status-only pass. Images are added as real image blocks referencing seeded
 * media: media 7 has an alt text, media 9 intentionally has none.
 */
describe('Analyze — built-in alt text analyzer', async () => {
  await setupEditorE2E()

  let page: Page

  const validResult = () =>
    analyzeResult(page, 'blokkli:image-alt-text:valid', 'pass')
  const missingResult = () =>
    analyzeResult(page, 'blokkli:image-alt-text:missing', 'violation')

  /**
   * Add an image block referencing a seeded media item — the same adapter
   * call a drop from the media library makes, without the drag gesture.
   */
  function addImageBlock(mediaId: string): Promise<void> {
    return page.evaluate(async (mediaId) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.mediaLibraryAddBlock!({
          host: {
            type: app.context.value.entityType,
            uuid: app.context.value.entityUuid,
            fieldName: 'content',
          },
          preceedingUuid: null,
          targetBundle: 'image',
          item: {
            itemType: 'media_library',
            element: () => document.body,
            itemBundles: ['image'],
            mediaId,
            mediaBundle: 'image',
            label: '',
          },
        }),
      )
    }, mediaId)
  }

  beforeAll(async () => {
    page = await openEditor(EDITOR_PATH_EMPTY)
    await openSidebar(page, 'analyze')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
    await resetMockState(page)
  })

  test('passes on a page without images', async () => {
    await expect.poll(() => validResult().count()).toBe(1)
    expect(await missingResult().count()).toBe(0)
    // No image → the pass row is a status-only message without targets.
    expect(
      await validResult().locator('[data-test="analyze-target"]').count(),
    ).toBe(0)
  })

  test('passes when every image has an alt text', async () => {
    await addImageBlock('7')

    // Pass rows live in the collapsed success section. A single target opens
    // the row by itself; the target list renders lazily.
    await openAnalyzeSection(page, 'success')
    await expect
      .poll(() => validResult().locator('[data-test="analyze-target"]').count())
      .toBe(1)
    expect(await missingResult().count()).toBe(0)
  })

  test('reports an image without alt text as a violation', async () => {
    await addImageBlock('9')

    await expect.poll(() => missingResult().count()).toBe(1)
    const row = missingResult()
    await expect
      .poll(() => row.locator('[data-test="analyze-target"]').count())
      .toBe(1)
    // The node carries an identifier, so it can be ignored.
    expect(
      await row.locator('[data-test="analyze-target-ignore"]').count(),
    ).toBe(1)
    // The pass row stays, listing the images that do have an alt text (none).
    expect(await validResult().count()).toBe(1)
  })
})
