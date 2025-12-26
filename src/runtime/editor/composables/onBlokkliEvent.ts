import { eventBus } from '../events'
import type { EventbusEvents } from '#blokkli/types'
import { onBeforeUnmount, onMounted } from '#imports'

export function onBlokkliEvent<T extends keyof EventbusEvents>(
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
