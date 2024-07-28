import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { DraggableItem, DropArea } from '#blokkli/types'

export default function (
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
