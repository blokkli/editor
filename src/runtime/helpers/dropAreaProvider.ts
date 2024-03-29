import { falsy } from '.'
import type { DraggableItem, DropArea } from '#blokkli/types'

type DropAreaProviderFunction = (
  items: DraggableItem[],
) => (DropArea[] | DropArea | undefined) | void

export type DropAreaProvider = {
  add: (fn: DropAreaProviderFunction) => void
  remove: (fn: DropAreaProviderFunction) => void
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
