import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { DraggableItem } from '../types/draggable'
import type { DropArea } from '../types/ui'

export function defineDropAreas(
  cb: (items: DraggableItem[]) => DropArea | DropArea[] | undefined,
) {
  const { dragdrop } = useBlokkli()

  onMounted(() => {
    dragdrop.addDropArea(cb)
  })

  onBeforeUnmount(() => {
    dragdrop.removeDropArea(cb)
  })
}
