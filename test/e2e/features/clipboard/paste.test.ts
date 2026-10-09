import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { blockCount, blockState } from './../../support/blocks'
import { emitEvent } from './../../support/events'
import { pasteText, dropDragInto } from './../../support/clipboard'
import {
  bundleSelector,
  bundleSelectorItemIds,
  pickBundle,
} from './../../support/bundleSelector'

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
 * The playground mock maps `plaintext → ['text','title']` (→ selector) and
 * stores the pasted string as the new block's field value — so assertions are
 * locale-independent (bundle machine-names, stored values; never translated
 * labels). Only one paste per test: a second is swallowed by `onPaste`'s
 * in-drag guard.
 *
 * Drupal maps plain text to one paragraph type, so the selector cases stay
 * with the mock; the rest runs against Drupal
 * (`test/e2e-drupal/features/clipboard/paste`).
 */

const MARKER = 'UNIQUE_PASTE_MARKER_123'

/**
 * Page lifecycle: one editor page shared. Each test pastes once (the file's
 * preamble: "Only one paste per test: a second is swallowed by `onPaste`'s
 * in-drag guard"). On a shared page that's fine as long as every test cleanly
 * ends its drag — `afterEach` cancels a lingering bundle selector via Escape
 * (which the `ArtboardTooltip` listens for via `keyPressed`) and emits
 * `dragging:end` defensively. Each test takes a local `before` snapshot and
 * finds the newly-added block via uuid-diff rather than `selectedUuids[0]`
 * (a prior test's block can still be selected).
 */
describe('The clipboard feature', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
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

  test('pasting plain text opens a bundle selector with the mapped bundles', async () => {
    await pasteText(page, MARKER)

    const before = await blockCount(page)
    await dropDragInto(page)

    // Two bundles map to plaintext, so the user is asked to choose — nothing is
    // added until they do.
    await bundleSelector(page).waitFor({ state: 'visible' })
    expect((await bundleSelectorItemIds(page)).sort()).toEqual([
      'text',
      'title',
    ])
    expect(await blockCount(page)).toBe(before)
  })

  test('picking "title" instead creates a title block', async () => {
    await pasteText(page, MARKER)
    const uuidsBefore = await withApp(page, (app) => app.state.getAllUuids())
    await dropDragInto(page)
    await bundleSelector(page).waitFor({ state: 'visible' })

    await pickBundle(page, 'title')

    await expect.poll(() => blockCount(page)).toBe(uuidsBefore.length + 1)
    const newUuid = (
      await withApp(page, (app) => app.state.getAllUuids())
    ).find((uuid) => !uuidsBefore.includes(uuid))!
    const info = await blockState(page, newUuid)
    // The chosen bundle drives which block type is created.
    expect(info.bundle).toBe('title')
    expect(info.props?.title).toBe(MARKER)
  })
})
