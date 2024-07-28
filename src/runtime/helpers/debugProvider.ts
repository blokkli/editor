import type { StorageProvider } from './storageProvider'
import { type ComputedRef, computed, ref } from '#imports'

export type DebugLogger = {
  log: (...v: any) => void
  error: (...v: any) => void
}

type DebugOverlay = {
  id: string
  label: string
}

type RegisteredDebugOverlay = {
  id: string
  label: string
  active: boolean
}

export type DebugProvider = {
  isEnabled: ComputedRef<boolean>
  toggle: () => void
  log: (...v: any) => void
  createLogger: (name: string) => DebugLogger
  registerOverlay: (id: string, label: string) => void
  unregisterOverlay: (id: string) => void
  overlays: ComputedRef<RegisteredDebugOverlay[]>
  toggleOverlay: (id: string) => void
}

export default function (storage: StorageProvider): DebugProvider {
  const showDebug = storage.use('showDebug', false)
  const visible = storage.use<string[]>('visibleDebugOverlays', [])
  const registeredOverlays = ref<DebugOverlay[]>([])

  const isEnabled = computed(() => showDebug.value)

  function toggle() {
    showDebug.value = !showDebug.value
  }

  function log(...v: any) {
    if (!showDebug.value) {
      return
    }

    // eslint-disable-next-line no-console
    console.log(v)
  }

  function createLogger(name: string) {
    return {
      log(...v: any) {
        if (!showDebug.value) {
          return
        }
        // eslint-disable-next-line no-console
        console.log(`[${name}]: `, ...v)
      },
      error(...v: any) {
        if (!showDebug.value) {
          return
        }
        // eslint-disable-next-line no-console
        console.error(`[${name}]: `, ...v)
      },
    }
  }

  function registerOverlay(id: string, label: string) {
    registeredOverlays.value.push({ id, label })
  }

  function unregisterOverlay(id: string) {
    registeredOverlays.value = registeredOverlays.value.filter(
      (v) => v.id !== id,
    )
  }

  const overlays = computed(() => {
    return registeredOverlays.value.map((v) => {
      return {
        ...v,
        active: visible.value.includes(v.id),
      }
    })
  })

  function toggleOverlay(id: string) {
    if (visible.value.includes(id)) {
      visible.value = visible.value.filter((v) => v !== id)
    } else {
      visible.value = [...visible.value, id]
    }
  }

  return {
    isEnabled,
    toggle,
    log,
    createLogger,
    registerOverlay,
    unregisterOverlay,
    overlays,
    toggleOverlay,
  }
}
