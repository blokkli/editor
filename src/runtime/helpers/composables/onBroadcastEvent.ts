import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { BroadcastEvents } from '../broadcastProvider'

export default function <T extends keyof BroadcastEvents>(
  name: T,
  cb: (e: BroadcastEvents[T]) => void,
) {
  const { broadcast } = useBlokkli()

  onMounted(() => {
    broadcast.on(name, cb)
  })

  onBeforeUnmount(() => {
    broadcast.off(name, cb)
  })
}
