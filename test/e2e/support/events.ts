import type { Page } from 'playwright-core'
import type { EventbusEvents } from '../../../src/runtime/editor/events'

/**
 * Emit an event on the editor's event bus from a test — fully typed against the
 * editor's `EventbusEvents` map, so the payload is checked against the event
 * name (and optional for events whose payload includes `undefined`).
 *
 * The payload is structured-cloned into the page, so it must be serializable —
 * events carrying live DOM nodes (e.g. `highlight`) can't go through here and
 * need an in-page `evaluate` that builds the node itself.
 */
export function emitEvent<K extends keyof EventbusEvents>(
  page: Page,
  name: K,
  ...args: undefined extends EventbusEvents[K]
    ? [payload?: EventbusEvents[K]]
    : [payload: EventbusEvents[K]]
): Promise<void> {
  return page.evaluate(
    ({ name, payload }) =>
      (
        window.__BLOKKLI__!.app!.eventBus.emit as (
          name: string,
          payload?: unknown,
        ) => void
      )(name, payload),
    { name: name as string, payload: args[0] as unknown },
  )
}
