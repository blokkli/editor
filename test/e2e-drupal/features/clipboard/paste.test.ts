import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../../../e2e/support/session'
import { blockCount, blockState } from '../../../e2e/support/blocks'
import { topLevelBlockUuids } from '../../../e2e/support/selection'
import { emitEvent } from '../../../e2e/support/events'
import {
  pasteText,
  draggedBundles,
  dropDragInto,
} from '../../../e2e/support/clipboard'
import { bundleSelector } from '../../../e2e/support/bundleSelector'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

/**
 * The clipboard feature turns a paste into a drag-and-drop: `onPaste` detects
 * the content type (`clipboardMapBundle`), starts a drag carrying pre-built
 * clipboard items, and the drop runs `resolveBundles` → (a bundle selector when
 * 2+ bundles match the target field) → `execute` → `addBlockFromClipboardItem`.
 *
 * These tests drive the *real* paste (a synthetic DOM `ClipboardEvent`) and the
 * *real* drop dispatcher (`dragging:drop`), only short-circuiting the canvas
 * pointer hit-test that picks the drop target (not what's under test here — the
 * pointer drag is covered by `add-block-drag.test.ts`, and the WebGL hit-test
 * can't be driven deterministically). See `support/clipboard.ts`.
 *
 * Drupal maps plain text to `text` only (no selector), and a YouTube URL to
 * `video`: it creates a remote video media, whose oEmbed requests the E2E
 * sandboxes' video fake answers (`blokkli_playground_test`). Assertions are
 * locale-independent (bundle machine-names, stored values, document order;
 * never translated labels). Only one paste per test: a second is swallowed by
 * `onPaste`'s in-drag guard.
 */

const MARKER = 'UNIQUE_PASTE_MARKER_123'
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/**
 * Page lifecycle: one editor page shared, on the page "Blocks". Each test
 * pastes once, waits for Drupal to add the paragraph, and finds it via
 * uuid-diff rather than `selectedUuids[0]` (a prior test's paragraph can still
 * be selected). `afterEach` emits `dragging:end` defensively.
 */
describe('The clipboard feature', async () => {
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
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
  })

  test('pasting plain text adds a text carrying the pasted content', async () => {
    await pasteText(page, MARKER)
    // Drupal maps plain text to one paragraph type: nothing to choose.
    expect(await draggedBundles(page)).toEqual(['text'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropDragInto(page, { fieldName: 'field_paragraphs' })

    const info = await blockState(page, await addedSince(uuidsBefore))
    expect(info.bundle).toBe('text')
    expect(info.props?.text).toContain(MARKER)
    expect(await bundleSelector(page).count()).toBe(0)
  })

  test('pasting a YouTube URL adds a video block directly (no selector)', async () => {
    await pasteText(page, YOUTUBE_URL)

    // The URL was detected as a video, so a single bundle resolves — no choice.
    expect(await draggedBundles(page)).toEqual(['video'])

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    const added = nextMutation(page, 'pbAddVideoRemote')
    await dropDragInto(page, { fieldName: 'field_paragraphs' })

    expect(await added).toMatchObject({ url: YOUTUBE_URL })
    const info = await blockState(page, await addedSince(uuidsBefore))
    expect(info.bundle).toBe('video')
    expect(await bundleSelector(page).count()).toBe(0)
    // The media's name is the video fake's oEmbed title.
    expect(info.props?.video?.name).toBe('A video on YouTube')
  })

  test('the drop inserts the block at the chosen position', async () => {
    const topBefore = await topLevelBlockUuids(page)
    const first = topBefore[0]!

    await pasteText(page, MARKER)
    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropDragInto(page, {
      fieldName: 'field_paragraphs',
      preceedingUuid: first,
    })

    // Dropping after `first` places the new paragraph immediately after it.
    const newUuid = await addedSince(uuidsBefore)
    const topAfter = await topLevelBlockUuids(page)
    expect(topAfter[topAfter.indexOf(first) + 1]).toBe(newUuid)
  })
})
