import { falsy } from '..'
import type { TourItem } from '#blokkli/types'
import { ref, type Ref } from '#imports'

type TourProviderFunction = () => TourItem[] | TourItem | undefined

export type TourProvider = {
  /**
   * Register a tour provider function.
   *
   * The function will be called when tour items are requested.
   * It can return a single tour item, an array of tour items, or undefined.
   *
   * @param fn - Function that returns tour item(s)
   *
   * @example
   * ```ts
   * tour.add(() => ({
   *   id: 'welcome',
   *   title: 'Welcome',
   *   text: 'Welcome to the editor!',
   *   element: '.bk-main-canvas',
   * }))
   * ```
   */
  add: (fn: TourProviderFunction) => void

  /**
   * Unregister a tour provider function.
   *
   * Removes a previously registered function so it no longer provides tour items.
   *
   * @param fn - The function to remove (must be the same reference used in add)
   */
  remove: (fn: TourProviderFunction) => void

  /**
   * Get all tour items from all registered providers.
   *
   * Calls all registered provider functions, flattens the results,
   * and filters out undefined values.
   *
   * @returns Array of all available tour items
   */
  getTourItems: () => TourItem[]

  /**
   * Whether a tour is currently active.
   *
   * Set to true when a tour starts, false when it ends.
   */
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
