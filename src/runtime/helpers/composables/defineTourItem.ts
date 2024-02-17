import type { TourItem } from '#blokkli/types'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'

export default function (cb: () => TourItem | TourItem[] | undefined) {
  const { tour } = useBlokkli()

  onMounted(() => {
    tour.add(cb)
  })

  onBeforeUnmount(() => {
    tour.remove(cb)
  })
}
