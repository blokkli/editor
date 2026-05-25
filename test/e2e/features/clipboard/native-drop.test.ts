import { describe, expect, test } from 'vitest'
import { openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { blockCount, blockState } from './../../support/blocks'
import { selectedUuids } from './../../support/selection'
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

describe('Native (OS) drag and drop', async () => {
  await setupEditorE2E()

  test('dropping dragged text opens the bundle selector and adds the chosen block', async () => {
    const page = await openEditor()
    await nativeDragEnterText(page, 'dragged text')

    // The drag knows only that it's text → the plaintext bundles.
    expect((await draggedBundles(page)).sort()).toEqual(['text', 'title'])

    const before = await blockCount(page)
    await dropNativeDrag(page, { text: 'dragged text' })

    await bundleSelector(page).waitFor({ state: 'visible' })
    expect((await bundleSelectorItemIds(page)).sort()).toEqual([
      'text',
      'title',
    ])
    await pickBundle(page, 'text')

    await expect.poll(() => blockCount(page)).toBe(before + 1)
    const uuid = (await selectedUuids(page))[0]!
    const info = await blockState(page, uuid)
    expect(info.bundle).toBe('text')
    expect(info.props?.text).toBe('dragged text')

    await page.close()
  })

  test('dropping a dragged YouTube URL adds a video block directly (no selector)', async () => {
    const page = await openEditor()
    await nativeDragEnterText(page, YOUTUBE_URL)

    // Still just "text" at drag-enter — the URL hasn't been read yet.
    expect((await draggedBundles(page)).sort()).toEqual(['text', 'title'])

    const before = await blockCount(page)
    // resolveBundles reads the transfer at drop time and detects the video.
    await dropNativeDrag(page, { text: YOUTUBE_URL })

    await expect.poll(() => blockCount(page)).toBe(before + 1)
    expect(await bundleSelector(page).count()).toBe(0)
    const uuid = (await selectedUuids(page))[0]!
    expect((await blockState(page, uuid)).bundle).toBe('video')

    await page.close()
  })
})
