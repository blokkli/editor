import { WritableComputedRef } from 'nuxt/dist/app/compat/capi'

const PREFIX = 'blokkli:'

export type PbStorageProvider = {
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
  } catch (_e) {}
}

/**
 * Create a reactive variable that is synced to local storage using the
 * given key. The sync only happens client side and after the component
 * has been mounted.
 *
 * This composable can be used to keep state across page navigations and
 * even after a refresh.
 */
export default function (): PbStorageProvider {
  const values = ref<Record<string, any>>({})

  const use = <T>(
    key: string | globalThis.ComputedRef<string>,
    defaultValue: T,
  ) => {
    const storageKey = computed(
      () => PREFIX + (typeof key === 'string' ? key : key.value),
    )
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
          return defaultValue
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
