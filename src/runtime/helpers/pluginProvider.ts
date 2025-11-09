import type { AddAction } from '#blokkli/types'
import type { BlokkliIcon } from '#blokkli-build/icons'
import { ref } from '#imports'

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

export type MenuButtonPlugin = {
  id: string
  title: string
  description: string
  icon?: BlokkliIcon
  type?: 'success' | 'danger' | 'yellow'
  weight?: number
  secondary?: boolean
  disabled?: boolean
  callback: () => void
}

type MenuButtonFunction = PluginAddFunction<MenuButtonPlugin>

// Type mapping for generic plugin methods
type PluginFunctionMap = {
  addAction: AddActionFunction
  itemDropdownAction: ItemDropdownActionFunction
  menuButton: MenuButtonFunction
}

type PluginDataMap = {
  addAction: AddAction
  itemDropdownAction: ItemDropdownAction
  menuButton: MenuButtonPlugin
}

export type PluginProvider = {
  add<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void
  remove<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void
  get<T extends keyof PluginDataMap>(type: T): PluginDataMap[T][]
}

export default function (): PluginProvider {
  const addActionPlugins = ref<AddActionFunction[]>([])
  const itemDropdownActionPlugins = ref<ItemDropdownActionFunction[]>([])
  const menuButtonPlugins = ref<MenuButtonFunction[]>([])

  function add<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void {
    if (type === 'addAction') {
      addActionPlugins.value.push(fn as AddActionFunction)
    } else if (type === 'itemDropdownAction') {
      itemDropdownActionPlugins.value.push(fn as ItemDropdownActionFunction)
    } else if (type === 'menuButton') {
      menuButtonPlugins.value.push(fn as MenuButtonFunction)
    }
  }

  function remove<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void {
    if (type === 'addAction') {
      addActionPlugins.value = addActionPlugins.value.filter(
        (v) => v !== fn,
      ) as AddActionFunction[]
    } else if (type === 'itemDropdownAction') {
      itemDropdownActionPlugins.value = itemDropdownActionPlugins.value.filter(
        (v) => v !== fn,
      ) as ItemDropdownActionFunction[]
    } else if (type === 'menuButton') {
      menuButtonPlugins.value = menuButtonPlugins.value.filter(
        (v) => v !== fn,
      ) as MenuButtonFunction[]
    }
  }

  function get<T extends keyof PluginDataMap>(type: T): PluginDataMap[T][] {
    let storage: PluginAddFunction<any>[]

    if (type === 'addAction') {
      storage = addActionPlugins.value
    } else if (type === 'itemDropdownAction') {
      storage = itemDropdownActionPlugins.value
    } else if (type === 'menuButton') {
      storage = menuButtonPlugins.value
    } else {
      return []
    }

    const result: any[] = []

    for (let i = 0; i < storage.length; i++) {
      const callback = storage[i]
      if (!callback) {
        continue
      }

      const callbackResult = callback()

      if (!callbackResult) {
        continue
      }

      if (Array.isArray(callbackResult)) {
        result.push(...callbackResult)
      } else {
        result.push(callbackResult)
      }
    }

    return result as PluginDataMap[T][]
  }

  return {
    add,
    remove,
    get,
  }
}
