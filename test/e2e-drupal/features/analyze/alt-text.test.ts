import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { dismissMessages } from '../../../e2e/support/overlays'
import {
  analyzeResult,
  openAnalyzeSection,
  openSidebar,
} from '../../../e2e/support/sidebar'
import { emitEvent } from '../../../e2e/support/events'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, revertAllChanges } from '../../support/session'

/**
 * The built-in `blokkli:image-alt-text` analyzer (registered by the sandbox's
 * adapter) reports every `<img>` without a non-empty `alt`.
 *
 * Runs on the page "Blank" (content/nodes/blank.yml), which renders no image
 * at all, so the baseline is a status-only pass. Images are added as real
 * image paragraphs referencing seeded media (content/media.yml): "The lake"
 * has an alt text, "The hills" intentionally has none.
 */
describe('Analyze — built-in alt text analyzer', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  const validResult = () =>
    analyzeResult(page, 'blokkli:image-alt-text:valid', 'pass')
  const missingResult = () =>
    analyzeResult(page, 'blokkli:image-alt-text:missing', 'violation')

  /**
   * Add an image paragraph referencing a seeded media item — the same adapter
   * call a drop from the media library makes, without the drag gesture. The
   * media is found in the library by its name: Drupal references it by its
   * numeric ID.
   */
  function addImageBlock(mediaName: string): Promise<void> {
    return page.evaluate(async (mediaName) => {
      const app = window.__BLOKKLI__!.app!
      const { items } = await app.adapter.mediaLibraryGetResults!({
        filters: {},
        page: 0,
      })
      const media = items.find((item) => item.label === mediaName)
      if (!media) {
        throw new Error(`The media library has no "${mediaName}".`)
      }
      await app.state.mutateWithLoadingState(() =>
        app.adapter.mediaLibraryAddBlock!({
          host: {
            type: app.context.value.entityType,
            uuid: app.context.value.entityUuid,
            fieldName: 'field_paragraphs',
          },
          preceedingUuid: null,
          targetBundle: 'image',
          item: {
            itemType: 'media_library',
            element: () => document.body,
            itemBundles: ['image'],
            mediaId: media.mediaId,
            mediaBundle: 'image',
            label: media.label,
          },
        }),
      )
    }, mediaName)
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/blank', 'blank'),
    )
    await openSidebar(page, 'analyze')
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    await emitEvent(page, 'select:unselect')
    await dismissMessages(page)
    await revertAllChanges(page)
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
    await addImageBlock('The lake')

    // Pass rows live in the collapsed success section. A single target opens
    // the row by itself; the target list renders lazily.
    await openAnalyzeSection(page, 'success')
    await expect
      .poll(() => validResult().locator('[data-test="analyze-target"]').count())
      .toBe(1)
    expect(await missingResult().count()).toBe(0)
  })

  test('reports an image without alt text as a violation', async () => {
    await addImageBlock('The hills')

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
