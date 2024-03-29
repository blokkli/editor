import { eventBus } from '../eventBus'
import type { EventbusEvents } from '#blokkli/types'
import { onBeforeUnmount, onMounted } from '#imports'

export default function <T extends keyof EventbusEvents>(
  name: T,
  cb: (e: EventbusEvents[T]) => void,
) {
  onMounted(() => {
    eventBus.on(name, cb)
  })

  onBeforeUnmount(() => {
    eventBus.off(name, cb)
  })
}
