import mitt from 'mitt'
import type { BlokkliEvents } from '#blokkli/types'

export const eventBus = mitt<BlokkliEvents>()

export const emitMessage = (
  message: string,
  type: 'success' | 'error' = 'success',
) => {
  eventBus.emit('message', { type, message })
}
