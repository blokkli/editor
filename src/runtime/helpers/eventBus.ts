import mitt from 'mitt'
import type { EventbusEvents } from '#blokkli/types'

export const eventBus = mitt<EventbusEvents>()

export const emitMessage = (
  message: string,
  type: 'success' | 'error' = 'success',
  additional?: string | Error | unknown,
) => {
  eventBus.emit('message', { type, message, additional })
}
