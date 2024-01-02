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

  const onBroadcastChannelMessage = (e: MessageEvent<BroadcastedEvent>) => {
    if (e.data.senderId === senderId) {
      return
    }
    broadcastEventBus.emit(e.data.name, e.data.data)
  }

  channel.addEventListener('message', onBroadcastChannelMessage)

  onBeforeUnmount(() => {
    channel.close()
  })

  return {
    ...broadcastEventBus,
    emit(name: any, data?: any) {
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
