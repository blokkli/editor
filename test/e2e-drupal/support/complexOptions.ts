import type { Locator, Page } from 'playwright-core'
import { emitEvent } from './events'
import { closeNestedEditor, nestedEditorOverlay } from './overlays'

// Helpers for the complex-options feature — the editor overlay used to edit
// structured option values (e.g. charts) registered via
// `registerComplexOptionType`. The overlay is a `<NestedEditorOverlay>` whose
// id is `complex-option-<dataType>`.

/** Locate the complex-option editor overlay for a data type (e.g. `chart`). */
export function complexOptionOverlay(page: Page, dataType: string): Locator {
  return nestedEditorOverlay(page, `complex-option-${dataType}`)
}

/**
 * Open the complex-option editor for a block's option key. Mirrors the
 * `option:edit-complex` event the edit feature emits when a block with a
 * complex option is edited.
 */
export function openComplexOption(
  page: Page,
  opts: { uuid: string; key: string; dataType: string },
): Promise<void> {
  return emitEvent(page, 'option:edit-complex', opts)
}

/**
 * Close the complex-option editor. Closing always saves through
 * `updateOptions`: wait for the backend's mutation in the spec (in the Drupal
 * suite, `nextMutation(page, 'pbUpdateParagraphOption')`).
 */
export function closeComplexOption(
  page: Page,
  dataType: string,
): Promise<void> {
  return closeNestedEditor(page, `complex-option-${dataType}`)
}
