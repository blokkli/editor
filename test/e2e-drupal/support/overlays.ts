import type { Locator, Page } from 'playwright-core'
import { emitEvent } from './events'

/**
 * Locate a modal dialog by its `id` (the `id` prop of `<DialogModal>`, surfaced
 * as `data-test="dialog-<id>"`, e.g. `publish` or `revert`). Returns a Locator
 * for presence / visibility assertions.
 */
export function dialog(page: Page, id: string): Locator {
  return page.locator(`[data-test="dialog-${id}"]`)
}

/**
 * The active dialog's primary submit button (`DialogModal`'s default footer
 * button). Only one dialog shows at a time, so this is unambiguous. Click it or
 * assert its state, e.g. `expect(await dialogSubmit(page).isDisabled()).toBe(true)`.
 */
export function dialogSubmit(page: Page): Locator {
  return page.locator('[data-test="dialog-submit"]')
}

/**
 * Locate a form overlay by its `id` (the `id` prop of `<FormOverlay>`, surfaced
 * as `data-test="form-overlay-<id>"`, e.g. `edit-form` for the block edit form,
 * or the add-action form ids). Returns a Locator for presence / visibility.
 */
export function formOverlay(page: Page, id: string): Locator {
  return page.locator(`[data-test="form-overlay-${id}"]`)
}

/**
 * Close an open `<FormOverlay>` by emitting `overlay:close` on the eventBus —
 * the same path the canvas overlay's "click outside" triggers, but without
 * the `confirmClose` two-click dance. Waits for the overlay to be removed so
 * the next interaction starts from a clean slate.
 */
export async function closeFormOverlay(page: Page, id: string): Promise<void> {
  await emitEvent(page, 'overlay:close')
  await formOverlay(page, id).waitFor({ state: 'hidden' })
}

/**
 * Locate a nested editor overlay by its `id` (the `id` prop of
 * `<NestedEditorOverlay>`, surfaced as `data-test="nested-editor-overlay-<id>"`,
 * e.g. `complex-option-chart`). Returns a Locator for presence / visibility.
 */
export function nestedEditorOverlay(page: Page, id: string): Locator {
  return page.locator(`[data-test="nested-editor-overlay-${id}"]`)
}

/**
 * Close a nested editor overlay via its header back button and wait until the
 * overlay is removed from the DOM. Note: for editors that persist on close
 * (e.g. complex options), prefer the domain helper that also awaits the save.
 */
export async function closeNestedEditor(page: Page, id: string): Promise<void> {
  await page.locator(`[data-test="nested-editor-overlay-close-${id}"]`).click()
  await nestedEditorOverlay(page, id).waitFor({ state: 'detached' })
}

/**
 * Dismiss every currently-visible toast message by emitting `message:clear` on
 * the eventBus. Messages auto-dismiss after ~6s, but on a shared page they
 * accumulate at the viewport bottom and can intercept clicks on action
 * toolbars near the bottom edge — call this in `afterEach` on shared pages
 * where any test submits a mutation that emits a success/error message.
 */
export function dismissMessages(page: Page): Promise<void> {
  return emitEvent(page, 'message:clear')
}

/** The texts of the toast messages shown. */
export function messageTexts(page: Page): Promise<string[]> {
  return page.locator('[data-test="message-close"]').allTextContents()
}

/** A toast message as the user sees it. */
export type ShownMessage = {
  /** What it says. */
  text: string
  /** What it says beneath, smaller. */
  additional: string | null
  /** Whether it offers the details of an error. */
  hasDetails: boolean
}

/** The toast messages shown, in their parts. */
export function shownMessages(page: Page): Promise<ShownMessage[]> {
  return page.locator('[data-test="message"]').evaluateAll((elements) =>
    elements.map((element) => {
      const part = (name: string) =>
        element.querySelector(`[data-test="message-${name}"]`)
      return {
        text: part('text')?.textContent?.trim() ?? '',
        additional: part('additional')?.textContent?.trim() ?? null,
        hasDetails: !!part('details'),
      }
    }),
  )
}
