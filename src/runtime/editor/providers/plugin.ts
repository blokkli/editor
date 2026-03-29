import type { BlokkliIcon } from '#blokkli-build/icons'
import { ref } from '#imports'
import type { ThemeColorName } from '../../../global/types/theme'
import type { AddAction } from '../types/actions'

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
  variant?: string
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

export type HighlightItem = {
  uuid?: string
  element?: HTMLElement
  color: ThemeColorName
  icon: BlokkliIcon
  label: string
  description?: string
  onClick: () => void
}

type HighlightFunction = PluginAddFunction<HighlightItem>

// Type mapping for generic plugin methods
type PluginFunctionMap = {
  addAction: AddActionFunction
  itemDropdownAction: ItemDropdownActionFunction
  menuButton: MenuButtonFunction
  highlight: HighlightFunction
}

type PluginDataMap = {
  addAction: AddAction
  itemDropdownAction: ItemDropdownAction
  menuButton: MenuButtonPlugin
  highlight: HighlightItem
}

export type PluginProvider = {
  /**
   * Register a plugin provider function.
   *
   * The function will be called when plugins of this type are requested.
   * It can return a single plugin, an array of plugins, or undefined.
   *
   * @param type - The plugin type ('addAction', 'itemDropdownAction', 'menuButton')
   * @param fn - Function that returns plugin(s)
   *
   * @example
   * ```ts
   * plugin.add('addAction', () => ({
   *   id: 'custom-add',
   *   label: 'Add Custom',
   *   bundles: ['text'],
   *   callback: () => console.log('add'),
   * }))
   * ```
   */
  add<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void

  /**
   * Unregister a plugin provider function.
   *
   * Removes a previously registered function so it no longer provides plugins.
   *
   * @param type - The plugin type
   * @param fn - The function to remove (must be the same reference used in add)
   */
  remove<T extends keyof PluginFunctionMap>(
    type: T,
    fn: PluginFunctionMap[T],
  ): void

  /**
   * Get all plugins from all registered providers.
   *
   * Calls all registered provider functions for this type, flattens the results,
   * and filters out undefined values.
   *
   * @param type - The plugin type to retrieve
   * @returns Array of all available plugins of this type
   */
  get<T extends keyof PluginDataMap>(type: T): PluginDataMap[T][]
}

export default function (): PluginProvider {
  const addActionPlugins = ref<AddActionFunction[]>([])
  const itemDropdownActionPlugins = ref<ItemDropdownActionFunction[]>([])
  const menuButtonPlugins = ref<MenuButtonFunction[]>([])
  const highlightPlugins = ref<HighlightFunction[]>([])

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
    } else if (type === 'highlight') {
      highlightPlugins.value.push(fn as HighlightFunction)
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
    } else if (type === 'highlight') {
      highlightPlugins.value = highlightPlugins.value.filter(
        (v) => v !== fn,
      ) as HighlightFunction[]
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
    } else if (type === 'highlight') {
      storage = highlightPlugins.value
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
