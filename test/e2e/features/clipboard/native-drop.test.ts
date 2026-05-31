import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { blockCount, blockState } from './../../support/blocks'
import { emitEvent } from './../../support/events'
import {
  nativeDragEnterText,
  dropNativeDrag,
  draggedBundles,
} from './../../support/clipboard'
import {
  bundleSelector,
  bundleSelectorItemIds,
  pickBundle,
} from './../../support/bundleSelector'

/** The `caret-tooltip` BlokkliTransition keeps the BundleSelector in the DOM
 *  during its leave (~150ms). Wait for it to detach so a follow-up test that
 *  asserts the selector did NOT appear isn't tripped by a prior test's ghost. */
async function waitForBundleSelectorGone(page: Page): Promise<void> {
  await bundleSelector(page).waitFor({ state: 'detached' })
}

/**
 * Dragging content from the OS into the editor (a native drag, as opposed to a
 * `Cmd+V` paste). `dragenter` → `tryStartDirectDrop` maps the dragged kind to
 * bundles (`buildMapBundleEvent` + `clipboardMapBundle`) and starts a
 * `native_drop` drag; the actual content is only known at drop time, when the
 * drop handler's `resolveBundles` reads the `dataTransfer` and detects the type
 * (video/URL/plaintext) — the branch a paste's pre-built items skip.
 *
 * At `dragenter` the browser exposes only the *kind* (string vs file), so a text
 * drag always maps to plaintext (`['text','title']` in the mock) regardless of
 * the eventual string — the YouTube detection happens at drop. Assertions are
 * locale-independent. See `support/clipboard.ts` for why the drop is emitted
 * directly rather than via the canvas.
 */

const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/**
 * Page lifecycle: one editor page shared. Each test starts its own native drag
 * via `nativeDragEnterText` and consumes it with `dropNativeDrag`; both end
 * with the drag cleared. Each test takes a local `before` snapshot so the
 * blocks added by earlier tests don't matter. Unlike `copy-paste.test.ts`,
 * native drags go through `onDragEnter`, not the `onPaste` `isLoading` guard
 * — no ordering constraint applies here.
 */
describe('Native (OS) drag and drop', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // End any lingering drag — the bundle-selector flow doesn't go through
    // the regular pointerup path.
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
    await waitForBundleSelectorGone(page)
  })

  test('dropping dragged text opens the bundle selector and adds the chosen block', async () => {
    await nativeDragEnterText(page, 'dragged text')

    // The drag knows only that it's text → the plaintext bundles.
    expect((await draggedBundles(page)).sort()).toEqual(['text', 'title'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropNativeDrag(page, { text: 'dragged text' })

    await bundleSelector(page).waitFor({ state: 'visible' })
    expect((await bundleSelectorItemIds(page)).sort()).toEqual([
      'text',
      'title',
    ])
    await pickBundle(page, 'text')

    await expect.poll(() => blockCount(page)).toBe(uuidsBefore.length + 1)
    // Find the newly-added block by diffing uuids — selection isn't reliably
    // replaced on a shared page (a prior test's block can still be selected).
    const newUuid = (
      await withApp(page, (app) => app.state.getAllUuids())
    ).find((uuid) => !uuidsBefore.includes(uuid))!
    const info = await blockState(page, newUuid)
    expect(info.bundle).toBe('text')
    expect(info.props?.text).toBe('dragged text')
  })

  test('dropping a dragged YouTube URL adds a video block directly (no selector)', async () => {
    await nativeDragEnterText(page, YOUTUBE_URL)

    // Still just "text" at drag-enter — the URL hasn't been read yet.
    expect((await draggedBundles(page)).sort()).toEqual(['text', 'title'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    // resolveBundles reads the transfer at drop time and detects the video.
    await dropNativeDrag(page, { text: YOUTUBE_URL })

    await expect.poll(() => blockCount(page)).toBe(uuidsBefore.length + 1)
    expect(await bundleSelector(page).count()).toBe(0)
    const newUuid = (
      await withApp(page, (app) => app.state.getAllUuids())
    ).find((uuid) => !uuidsBefore.includes(uuid))!
    expect((await blockState(page, newUuid)).bundle).toBe('video')
  })
})
