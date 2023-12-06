import mitt from 'mitt'
import type { ParagraphsBuilderEvents } from '#blokkli/types'

export const eventBus = mitt<ParagraphsBuilderEvents>()

export const emitMessage = (
  message: string,
  type: 'success' | 'error' = 'success',
) => {
  eventBus.emit('message', { type, message })
}
