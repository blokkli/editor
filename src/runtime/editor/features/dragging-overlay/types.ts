/**
 * Move the in-progress drag onto a specific drop target and center that target
 * in the viewport.
 *
 * This is a deterministic seam for driving the canvas drag (e.g. from E2E
 * tests): the drop slots are WebGL-rendered and live in artboard coordinates,
 * so figuring out where a given slot is on screen is fragile — especially for
 * blocks that are taller than the viewport or scrolled off-screen. Emitting
 * this event lets the dragging overlay resolve the exact slot rect itself and
 * center it, after which a consumer only has to move the pointer to the
 * viewport center to drop onto it.
 */
export type MoveToDropTargetEvent =
  | {
      /** Insert relative to an existing block, identified by its uuid. */
      block: string
      /** Whether to target the slot before or after that block. */
      position: 'before' | 'after'
    }
  | {
      /** The host entity uuid that owns the target field. */
      host: string
      /** The field name on the host entity. */
      fieldName: string
    }

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    'dragging:moveToDropTarget': MoveToDropTargetEvent
  }
}
