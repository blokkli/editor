import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { blockCount, blockState } from '../../support/blocks'
import { emitEvent } from '../../support/events'
import {
  nativeDragEnterText,
  dropNativeDrag,
  draggedBundles,
} from '../../support/clipboard'
import { bundleSelector } from '../../support/bundleSelector'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * Dragging content from the OS into the editor (a native drag, as opposed to a
 * `Cmd+V` paste). `dragenter` → `tryStartDirectDrop` maps the dragged kind to
 * bundles (`buildMapBundleEvent` + `clipboardMapBundle`) and starts a
 * `native_drop` drag; the actual content is only known at drop time, when the
 * drop handler's `resolveBundles` reads the `dataTransfer` and detects the type
 * (video/URL/plaintext) — the branch a paste's pre-built items skip.
 *
 * At `dragenter` the browser exposes only the *kind* (string vs file), so a text
 * drag always maps to plaintext (`text` and `title` in Drupal) regardless of the
 * eventual string — the YouTube detection, and which types the text fits,
 * happen at drop. A video's oEmbed
 * requests are answered by the E2E sandboxes' video fake
 * (`blokkli_playground_test`). Assertions are locale-independent. See
 * `support/clipboard.ts` for why the drop is emitted directly rather than via
 * the canvas.
 */

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
/** Longer than a title's 255 characters: only a text can hold it. */
const LONG_TEXT = `dragged text ${'A sentence of a long text. '.repeat(10)}`

/**
 * Page lifecycle: one editor page shared, on the page "Blocks". Each test
 * starts its own native drag via `nativeDragEnterText` and consumes it with
 * `dropNativeDrag`; both end with the drag cleared. Each test takes a local
 * `before` snapshot so the paragraphs added by earlier tests don't matter.
 * Unlike `copy-paste.test.ts`, native drags go through `onDragEnter`, not the
 * `onPaste` `isLoading` guard — no ordering constraint applies here.
 */
describe('Native (OS) drag and drop', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /** The paragraph added since `before`. */
  async function addedSince(before: string[]): Promise<string> {
    await expect.poll(() => blockCount(page)).toBe(before.length + 1)
    return (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !before.includes(uuid),
    )!
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // End any lingering drag.
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
    // The clipboard feature tracks its own `dragCounter` / `isDirectDrop` /
    // `nativeDropItem` state that's set on `dragenter` and cleared either on
    // `onNativeDrop` (real drop event) or `dragleave`. The test path emits
    // `dragging:drop` directly, so neither runs — dispatch `dragleave` to
    // reset the clipboard feature's counter so the next test's `dragenter`
    // hits `dragCounter === 1` and calls `tryStartDirectDrop`.
    await page.evaluate(() => {
      document.dispatchEvent(
        new DragEvent('dragleave', { bubbles: true, cancelable: true }),
      )
    })
  })

  test('dropping dragged text adds a text', async () => {
    await nativeDragEnterText(page, LONG_TEXT)

    // The drag knows only that it's text → the plaintext bundles.
    expect(await draggedBundles(page)).toEqual(['text', 'title'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    // The drop reads the text: too long for a title, so no choice.
    await dropNativeDrag(page, {
      fieldName: 'field_paragraphs',
      text: LONG_TEXT,
    })

    // Find the new paragraph by diffing uuids — selection isn't reliably
    // replaced on a shared page (a prior test's paragraph can still be
    // selected).
    const info = await blockState(page, await addedSince(uuidsBefore))
    expect(info.bundle).toBe('text')
    expect(info.props?.text).toContain('dragged text')
    expect(await bundleSelector(page).count()).toBe(0)
  })

  test('dropping a dragged YouTube URL adds a video block directly (no selector)', async () => {
    await nativeDragEnterText(page, YOUTUBE_URL)

    // Still just text at drag-enter — the URL hasn't been read yet.
    expect(await draggedBundles(page)).toEqual(['text', 'title'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    const added = nextMutation(page, 'pbAddVideoRemote')
    // resolveBundles reads the transfer at drop time and detects the video.
    await dropNativeDrag(page, {
      fieldName: 'field_paragraphs',
      text: YOUTUBE_URL,
    })

    expect(await added).toMatchObject({ url: YOUTUBE_URL })
    const info = await blockState(page, await addedSince(uuidsBefore))
    expect(info.bundle).toBe('video')
    expect(await bundleSelector(page).count()).toBe(0)
  })
})
