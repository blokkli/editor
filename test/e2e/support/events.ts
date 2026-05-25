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

/**
 * Resolve with the payload of the next `name` event on the editor's event bus.
 *
 * Call this BEFORE the action that triggers it and hold the promise (do not
 * await yet) — the in-page listener is registered synchronously when the
 * evaluate runs, and page commands serialize, so it's in place before any
 * subsequent interaction. Await the promise afterwards.
 *
 * The payload is structured-cloned out of the page, so it must be serializable
 * — events carrying live DOM nodes can't be captured this way.
 */
export function nextEvent<K extends keyof EventbusEvents>(
  page: Page,
  name: K,
): Promise<EventbusEvents[K]> {
  return page.evaluate(
    (name) =>
      new Promise<unknown>((resolve) =>
        (
          window.__BLOKKLI__!.app!.eventBus.on as (
            name: string,
            cb: (payload: unknown) => void,
          ) => void
        )(name, (payload) => resolve(payload)),
      ),
    name as string,
  ) as Promise<EventbusEvents[K]>
}
