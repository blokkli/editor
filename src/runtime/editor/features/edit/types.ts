export type EditBlockEvent = {
  uuid: string
  bundle: string
}

declare module '#blokkli/editor/events' {
  interface EventbusEvents {
    'item:edit': EditBlockEvent
  }
}
