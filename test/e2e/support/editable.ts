import type { Locator, Page } from 'playwright-core'
import type { EntityContext } from '../../../src/runtime/types'
import { emitEvent } from './events'

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
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        window.__BLOKKLI__!.app!.eventBus.on('editable:open', (e) =>
          resolve(e.fieldName),
        )
      }),
  )
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
