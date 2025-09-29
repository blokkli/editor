import {
  type ComputedRef,
  type WritableComputedRef,
  computed,
  onBeforeUnmount,
  ref,
  watch,
} from '#imports'
import { storageDefaults } from '#blokkli-build/config'
import type { BlokkliAdapter } from '#blokkli/adapter'

const PREFIX = 'blokkli:'

export type StorageProvider = {
  use: <T>(
    key: string | ComputedRef<string>,
    defaultValue: T,
    persist?: boolean,
  ) => WritableComputedRef<T>
  clearAll: () => void
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
): Promise<StorageProvider> {
  const values = ref<Record<string, any>>({})
  const defaults = ref<Record<string, any>>({})
  const isPersisting = ref(false)
  let timeout: number | null = null

  const persistableKeys = ref<string[]>([])

  onBeforeUnmount(() => {
    if (timeout) {
      window.clearTimeout(timeout)
    }
  })

  const persistedValues = adapter.userSettings
    ? await adapter.userSettings.load()
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

  return { use, clearAll, clear }
}
