import type { Locator, Page } from 'playwright-core'
import { emitEvent } from './events'

/**
 * Locate an onboarding popup by its `id` (the `id` prop of `<Popup>`, surfaced
 * as `data-test-popup`, e.g. `agent` or `tour`). Returns a Locator for presence
 * / visibility assertions.
 */
export function popup(page: Page, id: string): Locator {
  return page.locator(`[data-test-popup="${id}"]`)
}

/**
 * Dismiss a popup by clicking its close (X) button. Note `openEditor()` already
 * pre-dismisses the `agent` and `tour` popups via localStorage before they
 * render (popups only appear after a 1s delay), so this is for tests that
 * deliberately let a popup show and then exercise dismissing it.
 */
export function dismissPopup(page: Page, id: string): Promise<void> {
  return page.locator(`[data-test-popup-close="${id}"]`).click()
}

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

/** The active dialog's cancel (X) button. */
export function dialogCancel(page: Page): Locator {
  return page.locator('[data-test="dialog-cancel"]')
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
 * Dismiss every currently-visible toast message by emitting `message:clear` on
 * the eventBus. Messages auto-dismiss after ~6s, but on a shared page they
 * accumulate at the viewport bottom and can intercept clicks on action
 * toolbars near the bottom edge — call this in `afterEach` on shared pages
 * where any test submits a mutation that emits a success/error message.
 */
export function dismissMessages(page: Page): Promise<void> {
  return emitEvent(page, 'message:clear')
}
