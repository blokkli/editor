import mitt, { type Emitter } from 'mitt'
import type {
  EventbusEvents,
  MutatedField,
  UpdateBlockOptionEvent,
} from '#blokkli/types'

export const eventBus = mitt<EventbusEvents>()

export type BlokkliEventBus = Emitter<EventbusEvents>

export const emitMessage = (
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
  additional?: string | Error | unknown,
  replace?: boolean,
) => {
  eventBus.emit('message', { type, message, additional, replace })
}

type FrameEventBusEvents = {
  selectItems: string[]
  mutatedFields: MutatedField[]
  focus: string
  updateOption: UpdateBlockOptionEvent
}

export const frameEventBus = mitt<FrameEventBusEvents>()
