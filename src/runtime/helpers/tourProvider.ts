import { falsy } from '.'
import type { TourItem } from '#blokkli/types'
import { ref, type Ref } from '#imports'

type TourProviderFunction = () => TourItem[] | TourItem | undefined

export type TourProvider = {
  add: (fn: TourProviderFunction) => void
  remove: (fn: TourProviderFunction) => void
  getTourItems: () => TourItem[]
  isTouring: Ref<boolean>
}

export default function (): TourProvider {
  let functions: TourProviderFunction[] = []
  const isTouring = ref(false)

  const add = (fn: TourProviderFunction) => {
    functions.push(fn)
  }

  const remove = (fn: TourProviderFunction) => {
    functions = functions.filter((v) => v !== fn)
  }

  const getTourItems = () => functions.flatMap((fn) => fn()).filter(falsy)

  return {
    add,
    remove,
    getTourItems,
    isTouring,
  }
}
