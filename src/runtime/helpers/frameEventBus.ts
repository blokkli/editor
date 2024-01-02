import mitt from 'mitt'
import type { MutatedField, UpdateBlockOptionEvent } from '../types'

type FrameEventBusEvents = {
  selectItems: string[]
  mutatedFields: MutatedField[]
  focus: string
  updateOption: UpdateBlockOptionEvent
}

export const frameEventBus = mitt<FrameEventBusEvents>()
