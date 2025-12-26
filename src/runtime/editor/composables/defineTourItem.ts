import type { TourItem } from '#blokkli/types'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'

export function defineTourItem(cb: () => TourItem | TourItem[] | undefined) {
  const { tour } = useBlokkli()

  onMounted(() => {
    tour.add(cb)
  })

  onBeforeUnmount(() => {
    tour.remove(cb)
  })
}
