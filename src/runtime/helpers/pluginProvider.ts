import type { AddAction } from '#blokkli/types'
import type { BlokkliIcon } from '#blokkli-build/icons'

type PluginAddFunction<T> = () => T | T[] | undefined
type AddActionFunction = PluginAddFunction<AddAction>

export type ItemDropdownAction = {
  id: string
  label: string
  description?: string
  enabled?: boolean
  icon?: BlokkliIcon
  bundle?: string
  weight?: number
  group: string
  callback: () => void
}

type ItemDropdownActionFunction = PluginAddFunction<ItemDropdownAction>

export type PluginProvider = {
  addAddAction: (fn: AddActionFunction) => void
  removeAddAction: (fn: AddActionFunction) => void
  getAddActions: () => AddAction[]
  addItemDropdownAction: (fn: ItemDropdownActionFunction) => void
  removeItemDropdownAction: (fn: ItemDropdownActionFunction) => void
  getItemDropdownActions: () => ItemDropdownAction[]
}

export default function (): PluginProvider {
  let addActions: AddActionFunction[] = []
  let itemDropdownActions: ItemDropdownActionFunction[] = []

  function addAddAction(fn: AddActionFunction) {
    addActions.push(fn)
  }

  function removeAddAction(fn: AddActionFunction) {
    addActions = addActions.filter((v) => v !== fn)
  }

  function getAddActions(): AddAction[] {
    const actions: AddAction[] = []

    for (let i = 0; i < addActions.length; i++) {
      const callback = addActions[i]
      if (!callback) {
        continue
      }

      const result = callback()

      if (!result) {
        continue
      }

      if (Array.isArray(result)) {
        actions.push(...result)
      } else {
        actions.push(result)
      }
    }

    return actions
  }

  function addItemDropdownAction(fn: ItemDropdownActionFunction) {
    itemDropdownActions.push(fn)
  }

  function removeItemDropdownAction(fn: ItemDropdownActionFunction) {
    itemDropdownActions = itemDropdownActions.filter((v) => v !== fn)
  }

  function getItemDropdownActions(): ItemDropdownAction[] {
    const actions: ItemDropdownAction[] = []

    for (let i = 0; i < itemDropdownActions.length; i++) {
      const callback = itemDropdownActions[i]
      if (!callback) {
        continue
      }

      const result = callback()

      if (!result) {
        continue
      }

      if (Array.isArray(result)) {
        actions.push(...result)
      } else {
        actions.push(result)
      }
    }

    return actions
  }

  return {
    addAddAction,
    removeAddAction,
    getAddActions,
    addItemDropdownAction,
    removeItemDropdownAction,
    getItemDropdownActions,
  }
}
