import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp, BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import { blockCount, blockState } from '../../support/blocks'
import { topLevelBlockUuids } from '../../support/selection'
import { emitEvent } from '../../support/events'
import {
  pasteText,
  draggedBundles,
  dropDragInto,
} from '../../support/clipboard'
import {
  bundleSelector,
  bundleSelectorItemIds,
  pickBundle,
} from '../../support/bundleSelector'
import { storedFieldValue } from '../../support/editable'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

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
 * Pasted text becomes a `text` or a `title` (`clipboard_text_paragraphs`): the
 * Drupal adapter offers the types whose field can hold it, so a short text
 * opens the selector and a long one becomes a text. A YouTube URL becomes a
 * `video`: Drupal creates a remote video media, whose oEmbed requests the E2E
 * sandboxes' video fake answers (`blokkli_playground_test`). Assertions are
 * locale-independent (bundle machine-names, stored values, document order;
 * never translated labels). Only one paste per test: a second is swallowed by
 * `onPaste`'s in-drag guard.
 */

const MARKER = 'UNIQUE_PASTE_MARKER_123'
/** Longer than a title's 255 characters. */
const LONG_TEXT = `${MARKER} ${'A sentence of a long text. '.repeat(10)}`
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

/**
 * Page lifecycle: one editor page shared, on the page "Blocks". Each test
 * pastes once, waits for Drupal to add the paragraph, and finds it via
 * uuid-diff rather than `selectedUuids[0]` (a prior test's paragraph can still
 * be selected). `afterEach` cancels a lingering bundle selector via Escape
 * (which the `ArtboardTooltip` listens for via `keyPressed`) and emits
 * `dragging:end` defensively.
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
    if (await bundleSelector(page).isVisible()) {
      await page.keyboard.press('Escape')
      await bundleSelector(page).waitFor({ state: 'hidden' })
    }
    if (await withApp(page, (app) => app.selection.isDragging.value)) {
      await emitEvent(page, 'dragging:end')
    }
  })

  test('pasting a short text opens a bundle selector with text and title', async () => {
    await pasteText(page, MARKER)

    const before = await blockCount(page)
    await dropDragInto(page, { fieldName: 'field_paragraphs' })

    // Both fields can hold it, so the user is asked to choose — nothing is
    // added until they do.
    await bundleSelector(page).waitFor({ state: 'visible' })
    expect((await bundleSelectorItemIds(page)).sort()).toEqual([
      'text',
      'title',
    ])
    expect(await blockCount(page)).toBe(before)
  })

  test('picking "title" creates a title carrying the pasted text', async () => {
    await pasteText(page, MARKER)
    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropDragInto(page, { fieldName: 'field_paragraphs' })
    await bundleSelector(page).waitFor({ state: 'visible' })

    const added = nextMutation(page, 'pbAddClipboardText')
    await pickBundle(page, 'title')

    // The chosen bundle drives which paragraph type is created.
    expect(await added).toMatchObject({ bundle: 'title' })
    const info = await blockState(page, await addedSince(uuidsBefore))
    expect(info.bundle).toBe('title')
    expect(info.props?.title).toBe(MARKER)
  })

  test('pasting a long text adds a text without asking', async () => {
    await pasteText(page, LONG_TEXT)
    // Too long for a title: only the text is offered.
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
    // The dragged item shows the video's thumbnail: openEditor answers its
    // host with an image of the fixtures. The item is in the page twice, the
    // drop element and the drag's copy.
    await expect
      .poll(() =>
        page
          .locator('[data-test="clipboard-video-thumbnail"]')
          .evaluateAll((images) =>
            (images as HTMLImageElement[])
              .filter((img) => img.naturalWidth > 0)
              .map((img) => img.src),
          ),
      )
      .toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg')

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

  test('pasted HTML is stored without what the text format adds', async () => {
    // Copied from a web page: a link to another site, which basic_html renders
    // with target="_blank" and "(opens in a new tab)" after it. Drupal must
    // store the link as pasted, or every render adds the hint again.
    const html = '<p>Read <a href="https://www.example.com">more</a></p>'
    await pasteText(page, 'Read more', html)

    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropDragInto(page, { fieldName: 'field_paragraphs' })
    await bundleSelector(page).waitFor({ state: 'visible' })
    await pickBundle(page, 'text')

    const uuid = await addedSince(uuidsBefore)
    await expect
      .poll(() => storedFieldValue(page, uuid, 'field_text'))
      .toBe(html)
    // Rendered, the hint is there.
    expect((await blockState(page, uuid)).props?.text).toContain(
      '(opens in a new tab)',
    )
  })

  test('the drop inserts the block at the chosen position', async () => {
    const topBefore = await topLevelBlockUuids(page)
    const first = topBefore[0]!

    await pasteText(page, LONG_TEXT)
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
