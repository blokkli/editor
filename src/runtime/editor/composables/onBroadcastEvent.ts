import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { BroadcastEvents } from '../../helpers/providers/broadcast'

export function onBroadcastEvent<T extends keyof BroadcastEvents>(
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
