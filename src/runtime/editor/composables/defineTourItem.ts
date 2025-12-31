import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { TourItem } from '../features/tour/types'

export function defineTourItem(cb: () => TourItem | TourItem[] | undefined) {
  const { tour } = useBlokkli()

  onMounted(() => {
    tour.add(cb)
  })

  onBeforeUnmount(() => {
    tour.remove(cb)
  })
}
