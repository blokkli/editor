import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { DraggableItem } from '../types/draggable'
import type { DropArea } from '../types/ui'

export function defineDropAreas(
  cb: (items: DraggableItem[]) => DropArea | DropArea[] | undefined,
) {
  const { dropAreas } = useBlokkli()

  onMounted(() => {
    dropAreas.add(cb)
  })

  onBeforeUnmount(() => {
    dropAreas.remove(cb)
  })
}
