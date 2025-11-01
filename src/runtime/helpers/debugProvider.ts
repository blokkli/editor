import type { StorageProvider } from './storageProvider'
import {
  type ComputedRef,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from '#imports'
import { eventBus } from './eventBus'
import { useGlobalBlokkliObject } from './composables/useGlobalBlokkliObject'

export type DebugLogger = {
  log: (message: string, ...v: any) => void
  error: (message: string, ...v: any) => void
}

export type LogMessage = {
  type: 'log' | 'error' | 'event'
  name: string
  date: string
  message: string
  context?: string
}

export type BlokkliGlobal = {
  messages: LogMessage[]
}

declare global {
  interface Window {
    __BLOKKLI__: BlokkliGlobal
  }
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
  createLogger: (name: string) => DebugLogger
  registerOverlay: (id: string, label: string) => void
  unregisterOverlay: (id: string) => void
  overlays: ComputedRef<RegisteredDebugOverlay[]>
  toggleOverlay: (id: string) => void
  registeredLoggers: ComputedRef<string[]>
  enabledLoggers: ComputedRef<string[]>
  toggleLogger: (name: string) => void
  getMessages: () => LogMessage[]
}

export default function (storage: StorageProvider): DebugProvider {
  const showDebug = storage.use('showDebug', false)
  const visible = storage.use<string[]>('visibleDebugOverlays', [])
  const enabledLoggers = storage.use<string[]>('enabledDebugLoggers', [])
  const registeredOverlays = ref<DebugOverlay[]>([])
  const registeredLoggers = ref<string[]>([])

  const globalBlokkli = useGlobalBlokkliObject()
  globalBlokkli.init()

  const isEnabled = computed(() => showDebug.value)

  function toggle() {
    showDebug.value = !showDebug.value
  }

  function argToString(arg: any): string {
    if (arg === null) return 'null'
    if (arg === undefined) return 'undefined'
    if (typeof arg === 'string') return arg
    if (typeof arg === 'number') return String(arg)
    if (typeof arg === 'boolean') return String(arg)
    if (arg instanceof Error) return arg.stack || arg.message

    try {
      return JSON.stringify(arg, null, 2)
    } catch {
      return String(arg)
    }
  }

  const onEvent = (name: string | number | symbol, data: any) => {
    if (
      name === 'animationFrame' ||
      name === 'animationFrame:before' ||
      name === 'animationFrame:after' ||
      name === 'canvas:draw' ||
      name === 'updateMutatedFields'
    ) {
      return
    }

    globalBlokkli.pushMessage({
      type: 'event',
      name: String(name),
      date: new Date().toISOString(),
      message: data !== undefined && data !== null ? argToString(data) : '',
    })
  }

  /**
   * Check if a logger should actually log.
   * If no loggers are enabled (empty array), all should log.
   * If one or more are enabled, only those should log.
   */
  function shouldLog(name: string): boolean {
    if (!showDebug.value) {
      return false
    }

    // If no loggers are selected, all should log
    if (enabledLoggers.value.length === 0) {
      return true
    }

    // If one or more are selected, only those should log
    return enabledLoggers.value.includes(name)
  }

  function createLogger(name: string) {
    if (!registeredLoggers.value.includes(name)) {
      registeredLoggers.value.push(name)
    }

    function pushMessage(
      type: 'log' | 'error',
      message: string,
      context: any[],
    ) {
      globalBlokkli.pushMessage({
        type,
        name,
        date: new Date().toISOString(),
        message,
        context: context.map(argToString).join(' '),
      })
    }

    return {
      log(message: string, ...v: any[]) {
        pushMessage('log', message, v)

        if (!shouldLog(name)) {
          return
        }

        console.log(`[${name}]: ${message}`, ...v)
      },
      error(message: string, ...v: any[]) {
        pushMessage('error', message, v)

        if (!shouldLog(name)) {
          return
        }

        console.error(`[${name}]: ${message}`, ...v)
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

  function toggleLogger(name: string) {
    if (enabledLoggers.value.includes(name)) {
      enabledLoggers.value = enabledLoggers.value.filter((v) => v !== name)
    } else {
      enabledLoggers.value = [...enabledLoggers.value, name]
    }
  }

  onMounted(() => {
    eventBus.on('*', onEvent)
  })

  onBeforeUnmount(() => {
    eventBus.off('*', onEvent)
  })

  return {
    isEnabled,
    toggle,
    createLogger,
    registerOverlay,
    unregisterOverlay,
    overlays,
    toggleOverlay,
    registeredLoggers: computed(() => registeredLoggers.value),
    enabledLoggers: computed(() => enabledLoggers.value),
    toggleLogger,
    getMessages: globalBlokkli.getMessages,
  }
}
