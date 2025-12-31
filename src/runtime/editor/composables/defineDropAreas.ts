import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { DropArea } from '#blokkli/types'
import type { DraggableItem } from '../types/draggable'

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
