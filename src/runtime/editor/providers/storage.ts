import {
  type ComputedRef,
  type WritableComputedRef,
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from '#imports'
import { storageDefaults } from '#blokkli-build/editor-config'
import type { AdapterContext, BlokkliAdapter } from '#blokkli/editor/adapter'

const PREFIX = 'blokkli:'

export type StorageProvider = {
  /**
   * Create a reactive storage value synced to localStorage.
   *
   * The value is automatically persisted to localStorage on change.
   * Can optionally be synced to user settings on the server.
   *
   * @param key - Storage key (will be prefixed with 'blokkli:')
   * @param defaultValue - Default value if no stored value exists
   * @param persist - Whether to sync to server user settings (default: false)
   * @returns Reactive writable computed ref synced to storage
   *
   * @example
   * ```ts
   * const showGrid = storage.use('showGrid', false)
   * showGrid.value = true // Automatically saved to localStorage
   * ```
   */
  use: <T>(
    key: string | ComputedRef<string>,
    defaultValue: T,
    persist?: boolean,
  ) => WritableComputedRef<T>

  /**
   * Create a reactive storage value with entity context prefix.
   *
   * Same as `use()` but automatically prefixes the key with entity type and UUID.
   * Useful for entity-specific settings (e.g., sidebar state per page).
   *
   * @param key - Storage key (will be prefixed with context)
   * @param defaultValue - Default value if no stored value exists
   * @param persist - Whether to sync to server user settings (default: false)
   * @returns Reactive writable computed ref synced to storage
   *
   * @example
   * ```ts
   * // If context is node:abc123, key becomes 'sidebarOpen:node:abc123'
   * const sidebarOpen = storage.useWithContextPrefix('sidebarOpen', false)
   * ```
   */
  useWithContextPrefix: <T>(
    key: string,
    defaultValue: T,
    persist?: boolean,
  ) => WritableComputedRef<T>

  /**
   * Clear all blokkli storage values.
   *
   * Removes all localStorage entries starting with 'blokkli:' prefix.
   * Does not affect server user settings.
   */
  clearAll: () => void

  /**
   * Clear a specific storage value.
   *
   * Removes the value from localStorage (without prefix).
   *
   * @param key - The storage key to clear (without 'blokkli:' prefix)
   */
  clear: (key: string) => void
}

const getExisting = (key: string): any => {
  try {
    const value = localStorage.getItem(key)
    if (value) {
      return JSON.parse(value)
    }
  } catch {
    // Noop.
  }
}

/**
 * Create a reactive variable that is synced to local storage using the
 * given key. The sync only happens client side and after the component
 * has been mounted.
 *
 * This composable can be used to keep state across page navigations and
 * even after a refresh.
 */
export default async function (
  adapter: BlokkliAdapter<any>,
  context: ComputedRef<AdapterContext>,
): Promise<StorageProvider> {
  const values = ref<Record<string, any>>({})
  const defaults = ref<Record<string, any>>({})
  let timeout: number | null = null

  const persistableKeys = ref<string[]>([])

  onBeforeUnmount(() => {
    if (timeout) {
      window.clearTimeout(timeout)
    }
  })

  const persistedValues = adapter.userSettings
    ? await adapter.userSettings.load().then((v) => {
        if (typeof v === 'object' && v !== null) {
          return JSON.stringify(v)
        }
        return v
      })
    : null

  if (persistedValues) {
    values.value = JSON.parse(persistedValues)
  }

  const persistableData = computed(() => {
    const mapped = [...persistableKeys.value]
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        const value = values.value[key]
        if (value !== undefined) {
          acc[key] = value
        }

        return acc
      }, {})
    return JSON.stringify(mapped)
  })

  function persistUserSettings() {
    if (timeout) {
      window.clearTimeout(timeout)
    }

    timeout = window.setTimeout(async () => {
      if (!adapter.userSettings) {
        return
      }

      if (persistableData.value === persistedValues) {
        return
      }
      await adapter.userSettings.persist(persistableData.value)
    }, 1000)
  }

  if (adapter.userSettings) {
    watch(persistableData, persistUserSettings)
  }

  const use = <T>(
    key: string | ComputedRef<string>,
    providedDefaultValue: T,
    persist?: boolean,
  ) => {
    const storageKey = computed(
      () => PREFIX + (typeof key === 'string' ? key : key.value),
    )

    const storageDefaultsValue =
      storageDefaults[typeof key === 'string' ? key : key.value]
    const defaultValue =
      storageDefaultsValue &&
      typeof storageDefaultsValue === typeof providedDefaultValue
        ? storageDefaultsValue
        : providedDefaultValue

    // Only set the defaults if they're not already set.
    // This is avoiding a side effect, where when the settings dialog gets the
    // settings storage value it has no idea about their defaults and thus
    // provides a {} as the default value. This would override the previously
    // set default value from defineBlokkliFeature, resulting in the defaults
    // beeing lost.
    // We can do this because the feature settings are always loaded before
    // the settings dialog can be opened.
    if (!defaults.value[storageKey.value]) {
      defaults.value[storageKey.value] = defaultValue
    }

    if (values.value[storageKey.value] === undefined) {
      const existing = getExisting(storageKey.value)
      if (existing !== undefined) {
        values.value[storageKey.value] = existing
      } else {
        values.value[storageKey.value] = defaultValue
      }
    }

    if (persist) {
      if (!persistableKeys.value.includes(storageKey.value)) {
        persistableKeys.value.push(storageKey.value)
      }
    }

    return computed({
      get() {
        const v = values.value[storageKey.value]
        if (v === undefined) {
          return defaults.value[storageKey.value]
        }
        return v
      },
      set(newValue: T) {
        values.value[storageKey.value] = newValue
        window.localStorage.setItem(storageKey.value, JSON.stringify(newValue))
      },
    })
  }

  const useWithContextPrefix = <T>(
    key: string,
    providedDefaultValue: T,
    persist?: boolean,
  ) => {
    const fullKey =
      key + ':' + context.value.entityType + ':' + context.value.entityUuid
    return use(fullKey, providedDefaultValue, persist)
  }

  const clearAll = () => {
    values.value = {}
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(PREFIX)) {
        window.localStorage.removeItem(key)
      }
    })
  }

  const clear = (key: string) => {
    const storageKey = PREFIX + key
    values.value[storageKey] = undefined
    window.localStorage.removeItem(storageKey)
  }

  return { use, useWithContextPrefix, clearAll, clear }
}
