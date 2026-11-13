/**
 * Programmatically trigger one of the add buttons rendered for the current
 * single-block (or host) selection — the same effect as clicking the button on
 * the canvas, without needing its screen coordinates.
 *
 *  - `before` / `after`: the tabs that add a block before or after the
 *    selected block;
 *  - `field`: the button that adds a block at the end of the field
 *    `fieldName` of the selected block (or of the host, when the host is
 *    selected).
 *
 * Like the canvas buttons, it does nothing when the block can't be added
 * there: the field is full, read-only or not editable by the user.
 */
export type SelectionAddButtonTriggerEvent =
  | { position: 'before' | 'after' }
  | { position: 'field'; fieldName: string }

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    'selection:add-button:trigger': SelectionAddButtonTriggerEvent
  }
}
