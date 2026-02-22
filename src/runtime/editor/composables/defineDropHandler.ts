import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { DraggableItemTypes } from '../types/draggable'
import type { DropHandler } from '../providers/dragdrop'

export function defineDropHandler<K extends keyof DraggableItemTypes>(
  itemType: K,
  handler: DropHandler<K>,
) {
  const { dragdrop } = useBlokkli()

  onMounted(() => {
    dragdrop.registerDropHandler(itemType, handler)
  })

  onBeforeUnmount(() => {
    dragdrop.unregisterDropHandler(itemType, handler)
  })
}
