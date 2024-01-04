import mitt, { type Emitter } from 'mitt'
import { onBeforeUnmount } from 'vue'

type BroadcastEvents = {
  previewFocused: undefined
}

export type BroadcastProvider = Emitter<BroadcastEvents>

type BroadcastedEvent = {
  name: keyof BroadcastEvents
  data: any
  senderId: string
}

export default function (): BroadcastProvider {
  const senderId = Math.round(Math.random() * 10000000000).toString()
  const broadcastEventBus = mitt<BroadcastEvents>()
  const channel = new BroadcastChannel('blokkli')

  channel.addEventListener('message', (e: MessageEvent<BroadcastedEvent>) => {
    // Prevent recursion when forwarding messages.
    if (e.data.senderId === senderId) {
      return
    }

    // Emit the event in the local event bus.
    broadcastEventBus.emit(e.data.name, e.data.data)
  })

  onBeforeUnmount(() => channel.close())

  return {
    ...broadcastEventBus,
    emit(name: any, data?: any) {
      // Custom emit method that forwards all events to the broadcast channel.
      const event: BroadcastedEvent = {
        name,
        data,
        senderId,
      }
      channel.postMessage(event)
      broadcastEventBus.emit(name, data)
    },
  }
}
