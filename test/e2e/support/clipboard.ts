import type { Page } from 'playwright-core'
import { withApp } from './session'

// Drive the clipboard feature's paste / drop / copy pipelines.
//
// A paste is a real DOM `ClipboardEvent`, a native drag a real `dragenter`
// `DragEvent` — so the editor's `onPaste` / `onDragEnter` handlers, content
// detection (`clipboardMapBundle`, video/URL detection) and drag start run for
// real. The drag they start is then dropped onto a field by emitting the
// editor's real `dragging:drop` with the in-flight `selection.dragItems`. We do
// not drive the canvas pointer hit-test that normally picks the drop target —
// that's the dragging-overlay's job (the pointer drag is covered by
// `add-block-drag.test.ts`), and it can't be driven deterministically (WebGL).
// Everything downstream of the drop — the `onDrop` dispatcher, `resolveBundles`,
// the bundle selector, `execute`, and the adapter call — is the real thing.
//
// `dragging:drop` carries a live `field` and item `element`/`dataTransfer`, so
// the drop is emitted in-page (`page.evaluate`) rather than through the
// structure-cloning `emitEvent` helper.

// ---------------------------------------------------------------------------
// Paste
// ---------------------------------------------------------------------------

/**
 * Dispatch a synthetic `paste` `ClipboardEvent` on `document` carrying `text` as
 * `text/plain` (Chromium reflects `clipboardData` set from the constructor).
 * Low-level: does not wait for anything — use it when asserting that a paste is
 * *ignored* (no drag should start).
 */
export function dispatchPaste(page: Page, text: string): Promise<void> {
  return page.evaluate((pasted) => {
    const dt = new DataTransfer()
    dt.setData('text/plain', pasted)
    document.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, text)
}

/**
 * Paste `text` and resolve once detection has produced a drag — i.e. the
 * clipboard feature emitted `dragging:start` and `selection.dragItems` is
 * populated. Detection is async (it awaits `getVideoId`), hence the poll. Also
 * used to paste a copied-selection envelope (JSON `text` is routed by `onPaste`
 * to the `clipboard:paste` listener, which starts an `existing`/copy drag).
 *
 * NOTE: only one paste per page — a second is swallowed by `onPaste`'s
 * `isDragging`/`isLoading` guard. Use a fresh `openEditor` per test.
 */
export async function pasteText(page: Page, text: string): Promise<void> {
  await dispatchPaste(page, text)
  await waitForDrag(page, `paste did not start a drag for: ${text}`)
}

// ---------------------------------------------------------------------------
// Native (OS) drag
// ---------------------------------------------------------------------------

/**
 * Simulate a native drag of `text` entering the editor: dispatch a `dragenter`
 * `DragEvent` whose `dataTransfer` holds `text` (so `buildMapBundleEvent` sees a
 * string item). Resolves once the resulting `native_drop` drag has started.
 */
export async function nativeDragEnterText(
  page: Page,
  text: string,
): Promise<void> {
  await page.evaluate((t) => {
    const dt = new DataTransfer()
    dt.setData('text/plain', t)
    document.dispatchEvent(
      new DragEvent('dragenter', {
        dataTransfer: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, text)
  await waitForDrag(page, `native drag of "${text}" did not start`)
}

/**
 * Drop an in-flight native drag, attaching a `dataTransfer` carrying `text` to
 * the `native_drop` item first (mirroring what `onNativeDrop` does with the real
 * drop event). The drop handler's `resolveBundles` then reads the transfer to
 * detect the content type (video/URL/plaintext) — the native-drag code path,
 * distinct from a clipboard paste's pre-built items.
 */
export async function dropNativeDrag(
  page: Page,
  opts: DropDragOptions & { text: string },
): Promise<void> {
  await page.evaluate((text) => {
    const app = window.__BLOKKLI__!.app!
    const item = app.selection.dragItems.value[0]
    if (!item || item.itemType !== 'native_drop') {
      throw new Error('No native drag in progress')
    }
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    item.dataTransfer = dt
  }, opts.text)
  await dropDragInto(page, opts)
}

// ---------------------------------------------------------------------------
// Copy (selection → clipboard)
// ---------------------------------------------------------------------------

/**
 * Copy the current selection via the editor's `Cmd/Ctrl+C` shortcut. The
 * shortcut only fires when the canvas is focused, so we focus it first (what
 * `AnimationCanvas` does on real focus). Writes a clipboard envelope (capture it
 * with {@link captureClipboard}) and arms the in-editor paste action.
 */
export function copySelection(page: Page): Promise<void> {
  return page.evaluate(() => {
    const app = window.__BLOKKLI__!.app!
    app.ui.setCanvasFocused(true)
    app.eventBus.emit('keyPressed', {
      code: 'c',
      meta: true,
      shift: false,
      originalEvent: new KeyboardEvent('keydown', { key: 'c', metaKey: true }),
    })
  })
}

/**
 * Replace `navigator.clipboard.writeText` with a recorder, so a copy's output
 * can be asserted without real clipboard permissions (which are flaky in
 * headless and need a focused context). Read the writes with {@link copiedText}.
 */
export function captureClipboard(page: Page): Promise<void> {
  return page.evaluate(() => {
    const w = window as unknown as { __copied: string[] }
    w.__copied = []
    navigator.clipboard.writeText = (text: string) => {
      w.__copied.push(text)
      return Promise.resolve()
    }
  })
}

/** The texts written to the clipboard since {@link captureClipboard}. */
export function copiedText(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __copied: string[] }).__copied,
  )
}

// ---------------------------------------------------------------------------
// Drop dispatch + drag inspection
// ---------------------------------------------------------------------------

/**
 * The bundles of the in-flight dragged item (e.g. `['text','title']` for
 * plaintext, `['video']` for a YouTube URL). Lets a test assert what a paste or
 * native drag resolved to before dropping.
 */
export function draggedBundles(page: Page): Promise<string[]> {
  return withApp(page, (app) => {
    const item = app.selection.dragItems.value[0]
    return item && 'itemBundles' in item ? [...item.itemBundles] : []
  })
}

export interface DropDragOptions {
  /** Target field on the host (defaults to the host entity's `content`). */
  fieldName?: string
  /** Host uuid the field lives on (defaults to the host entity uuid). */
  hostUuid?: string
  /** Insert after this block's uuid; `null` (default) prepends to the field. */
  preceedingUuid?: string | null
}

/**
 * Drop the in-flight drag onto a field by emitting the editor's real
 * `dragging:drop`, resolving the live field via `fields.find`. Runs the real
 * `onDrop` dispatcher (and thus the bundle selector when 2+ bundles resolve).
 */
export function dropDragInto(
  page: Page,
  opts: DropDragOptions = {},
): Promise<void> {
  return page.evaluate((o) => {
    const app = window.__BLOKKLI__!.app!
    const fieldName = o.fieldName ?? 'content'
    const hostUuid = o.hostUuid ?? app.context.value.entityUuid
    const field = app.fields.find(hostUuid, fieldName)
    if (!field) {
      throw new Error(`Field "${fieldName}" not registered on ${hostUuid}`)
    }
    app.eventBus.emit('dragging:drop', {
      field,
      preceedingUuid: o.preceedingUuid ?? null,
      items: [...app.selection.dragItems.value],
      host: {
        type: field.hostEntityType,
        uuid: field.hostEntityUuid,
        fieldName: field.name,
      },
    })
  }, opts)
}

/** Poll (in-page) until a drag is in progress, throwing `message` on timeout. */
function waitForDrag(page: Page, message: string): Promise<void> {
  return page.evaluate(async (msg) => {
    const app = window.__BLOKKLI__!.app!
    const start = Date.now()
    while (!app.selection.dragItems.value.length && Date.now() - start < 6000) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (!app.selection.dragItems.value.length) {
      throw new Error(msg)
    }
  }, message)
}
