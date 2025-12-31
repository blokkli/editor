import { falsy } from '../../helpers'
import type { DropArea } from '#blokkli/editor/types/ui'
import type { DraggableItem } from '../types/draggable'

type DropAreaProviderFunction = (
  items: DraggableItem[],
) => DropArea[] | DropArea | undefined

export type DropAreaProvider = {
  /**
   * Register a drop area provider function.
   *
   * The function will be called when drop areas are requested during drag operations.
   * It receives the currently dragged items and can return drop areas where those items can be dropped.
   *
   * @param fn - Function that returns drop areas based on dragged items
   *
   * @example
   * ```ts
   * dropArea.add((items) => {
   *   // Only provide drop area for text blocks
   *   if (items.every(item => item.bundle === 'text')) {
   *     return {
   *       id: 'custom-area',
   *       label: 'Text Only Area',
   *       accepts: (item) => item.bundle === 'text',
   *     }
   *   }
   * })
   * ```
   */
  add: (fn: DropAreaProviderFunction) => void

  /**
   * Unregister a drop area provider function.
   *
   * Removes a previously registered function so it no longer provides drop areas.
   *
   * @param fn - The function to remove (must be the same reference used in add)
   */
  remove: (fn: DropAreaProviderFunction) => void

  /**
   * Get all drop areas from all registered providers.
   *
   * Calls all registered provider functions with the dragged items,
   * flattens the results, and filters out undefined values.
   *
   * @param items - The currently dragged items
   * @returns Array of all available drop areas for these items
   */
  getDropAreas: (items: DraggableItem[]) => DropArea[]
}

export default function (): DropAreaProvider {
  let functions: DropAreaProviderFunction[] = []

  const add = (fn: DropAreaProviderFunction) => {
    functions.push(fn)
  }

  const remove = (fn: DropAreaProviderFunction) => {
    functions = functions.filter((v) => v !== fn)
  }

  const getDropAreas = (items: DraggableItem[]) =>
    functions
      .flatMap((fn) => {
        const v = fn(items)
        if (v) {
          return v
        }
        return null
      })
      .filter(falsy)

  return {
    add,
    remove,
    getDropAreas,
  }
}
