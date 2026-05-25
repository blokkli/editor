/**
 * Programmatically trigger one of the add buttons rendered for the current
 * single-block (or host) selection — the same effect as clicking the button on
 * the canvas, without needing its screen coordinates.
 *
 *  - `before` / `after`: the insert-before / insert-after buttons (only act
 *    when the field can actually accept another block, mirroring the canvas
 *    buttons' visibility);
 *  - `field`: the empty-field button at `index` (the n-th empty block field of
 *    the selected block, or empty host field when the host is selected).
 */
export type SelectionAddButtonTriggerEvent =
  | { position: 'before' | 'after' }
  | { position: 'field'; index: number }

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    'selection:add-button:trigger': SelectionAddButtonTriggerEvent
  }
}
