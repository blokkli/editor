import mitt from 'mitt'
import type { EventbusEvents } from '#blokkli/types'

export const eventBus = mitt<EventbusEvents>()

export const emitMessage = (
  message: string,
  type: 'success' | 'error' = 'success',
) => {
  eventBus.emit('message', { type, message })
}
