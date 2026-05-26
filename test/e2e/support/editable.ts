import type { Frame, Locator, Page } from 'playwright-core'
import type { EntityContext } from '../../../src/runtime/types'
import { emitEvent, nextEvent } from './events'

/**
 * Open a field's inline editor.
 *
 * Emits the `editable:open` event that the editable-field feature listens for —
 * the same event the canvas double-click ultimately fires. We drive it directly
 * rather than synthesizing a canvas pointer event because the canvas hit-test
 * (`getEditableAtPoint`) works in artboard coordinates (pan/zoom-transformed),
 * not screen space, so a `boundingBox`-based click is unreliable. Testing the
 * field's *behaviour* doesn't need real canvas hit-testing — that warrants its
 * own primitive with proper artboard-coordinate conversion.
 *
 * Pass `uuid` for a block field; omit it for a host-entity field.
 */
export function openEditableField(
  page: Page,
  fieldName: string,
  uuid?: string,
): Promise<void> {
  return emitEvent(page, 'editable:open', { fieldName, uuid })
}

export interface EditableState {
  html: string
  text: string
  /** Whether the diff-preview attribute is set on the element. */
  diffActive: boolean
  /** Whether the element currently contains `<ins>`/`<del>` diff markup. */
  hasDiffMarkup: boolean
}

/** Read an editable's current DOM state — used to assert preview vs. clean. */
export function editableState(
  page: Page,
  fieldName: string,
  host: EntityContext,
): Promise<EditableState | null> {
  return page.evaluate(
    ({ fieldName, host }) => {
      const element = window.__BLOKKLI__!.app!.directive.findEditableElement(
        fieldName,
        host,
      )
      if (!element) {
        return null
      }
      return {
        html: element.innerHTML,
        text: element.textContent ?? '',
        diffActive: element.hasAttribute('data-bk-diff-active'),
        hasDiffMarkup: element.querySelector('ins, del') !== null,
      }
    },
    { fieldName, host },
  )
}

/** Read an editable field's current trimmed text. */
export async function editableText(
  page: Page,
  fieldName: string,
  host: EntityContext,
): Promise<string> {
  const state = await editableState(page, fieldName, host)
  return state?.text.trim() ?? ''
}

/** Wait until an editable field's trimmed text equals `expected`. */
export function waitForEditableText(
  page: Page,
  fieldName: string,
  host: EntityContext,
  expected: string,
): Promise<unknown> {
  return page.waitForFunction(
    ({ fieldName, host, expected }) => {
      const el = window.__BLOKKLI__!.app!.directive.findEditableElement(
        fieldName,
        host,
      )
      return !!el && el.textContent?.trim() === expected
    },
    { fieldName, host, expected },
  )
}

/**
 * Resolve with the `fieldName` of the next `editable:open` event.
 *
 * Call this BEFORE the action that triggers it and hold the promise (do not
 * await yet) — the in-page listener is registered synchronously when the
 * evaluate runs, and page commands serialize, so it's in place before any
 * subsequent interaction. Await the promise afterwards. This avoids stashing
 * the captured event on a `window` global (and the casts that come with it).
 */
export function nextEditableOpen(page: Page): Promise<string> {
  return nextEvent(page, 'editable:open').then((e) => e.fieldName)
}

/**
 * The open inline plaintext editable editor — the textarea the editable-field
 * feature mounts and focuses when a plaintext editable opens (e.g. the `title`
 * field). Wait for it with `.waitFor({ state: 'visible' })`; it is the active
 * element when open, so focus can be asserted via `document.activeElement`.
 */
export function plaintextEditor(page: Page): Locator {
  return page.locator('#bk-editable-field-textarea')
}

/** The open editable overlay's form (carries `data-test-type` = the field type). */
export function editableOverlay(page: Page): Locator {
  return page.locator('[data-test="editable-overlay"]')
}

/** The overlay's Discard button (disabled until the value changes). */
export function discardButton(page: Page): Locator {
  return page.locator('[data-test="editable-discard"]')
}

/** Discard the current edit (restores the original value, no mutation). */
export async function discardEditable(page: Page): Promise<void> {
  await discardButton(page).click()
}

/** The plaintext overlay's character count (read from `data-test-count`). */
export async function charCount(page: Page): Promise<number> {
  const value = await page
    .locator('[data-test="editable-char-count"]')
    .getAttribute('data-test-count')
  return Number(value)
}

/**
 * The readability indicator's current state. Waits for the indicator to be
 * visible first (analysis is debounced ~500ms, so poll around this). `band` is
 * one of `easy|ok|hard` (or `null` when too short); `tooShort` is the
 * below-confidence state.
 */
export async function readabilityState(
  page: Page,
): Promise<{ band: string | null; tooShort: boolean }> {
  const indicator = page.locator('[data-test="editable-readability"]')
  await indicator.waitFor({ state: 'visible' })
  const band = await indicator.getAttribute('data-test-band')
  const tooShort = await indicator.getAttribute('data-test-too-short')
  return { band: band || null, tooShort: tooShort === 'true' }
}

/**
 * The host `EntityContext` (`type`/`bundle`/`uuid`) for a block — the shape
 * `editableState`/`editableText`/`waitForEditableText` expect for a block field.
 * Resolved from the block's own registered editable so we never hardcode the
 * item entity type.
 */
export function blockHost(page: Page, uuid: string): Promise<EntityContext> {
  return page.evaluate((u) => {
    const editable =
      window.__BLOKKLI__!.app!.directive.getEditablesForBlock(u)[0]
    if (!editable) {
      throw new Error(`No editable registered for block ${u}`)
    }
    return { type: editable.type, bundle: editable.bundle, uuid: editable.uuid }
  }, uuid)
}

/** The open frame (CKEditor iframe) editor's `data-test-src` (the computed url). */
export function frameSrc(page: Page): Promise<string | null> {
  return page.locator('[data-test="editable-frame"]').getAttribute('data-test-src')
}

/**
 * The open frame editable's content frame, once its CKEditor has mounted.
 *
 * The frame is a same-origin page (`/blokkli-form/.../fieldValueEditor`) hosting
 * a CKEditor. Wait for `.ck-editor__editable` (the editor's own, non-mangled
 * markup) so a subsequent `setFrameValue` actually applies.
 */
export async function editableFrame(page: Page): Promise<Frame> {
  const locator = page.locator('[data-test="editable-frame"]')
  await locator.waitFor({ state: 'attached' })
  const handle = await locator.elementHandle()
  const frame = await handle?.contentFrame()
  if (!frame) {
    throw new Error('Editable frame has no content frame')
  }
  await frame.waitForFunction(
    () => !!document.querySelector('.ck-editor__editable'),
  )
  return frame
}

/**
 * Set the frame editor's value deterministically.
 *
 * Posts the same `blokkli__editable_field_set_value` message the editor uses to
 * push translations/undo back into the iframe → CKEditor `setData` → the editor
 * re-emits the value to the parent (live preview + persist on save). This is the
 * robust equivalent of typing into CKEditor, whose keystroke handling inside an
 * iframe is unreliable under Playwright. Call `editableFrame()` first so the
 * editor is mounted.
 */
export function setFrameValue(page: Page, html: string): Promise<void> {
  return page.evaluate((text) => {
    const iframe = document.querySelector('[data-test="editable-frame"]')
    if (iframe instanceof HTMLIFrameElement) {
      iframe.contentWindow?.postMessage(
        { name: 'blokkli__editable_field_set_value', data: { text } },
        '*',
      )
    }
  }, html)
}

/** Save the open editable by emitting the click-away event (the overlay saves on it). */
export function saveByClickAway(page: Page): Promise<void> {
  return emitEvent(page, 'window:clickAway')
}
