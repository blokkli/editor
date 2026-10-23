/**
 * Whether a message comes from the window the listener talks to, on the
 * origin it expects.
 *
 * Every window can post messages to the editor: a project's frame in a block,
 * or a frame inside the previewed page. A frame keeps its window when it
 * navigates, so the origin is checked as well.
 */
export function isMessageFrom(
  e: MessageEvent,
  source: MessageEventSource | null | undefined,
  origin: string | null,
): boolean {
  return !!source && !!origin && e.source === source && e.origin === origin
}
