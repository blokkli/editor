import { type ComputedRef, type WritableComputedRef, computed, ref } from 'vue'
import { storageDefaults } from '#blokkli/config'

const PREFIX = 'blokkli:'

export type StorageProvider = {
  use: <T>(
    key: string | ComputedRef<string>,
    defaultValue: T,
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
export default function (): StorageProvider {
  const values = ref<Record<string, any>>({})
  const defaults = ref<Record<string, any>>({})

  const use = <T>(
    key: string | ComputedRef<string>,
    providedDefaultValue: T,
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
