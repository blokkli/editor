import type { StorageProvider } from './storage'
import {
  type ComputedRef,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from '#imports'
import { useGlobalBlokkliObject } from '#blokkli/editor/composables'
import type { BlokkliEventBus } from '../events'

export type DebugLogger = {
  /**
   * Log a debug message.
   *
   * The message is always stored in the message history.
   * It's only output to console if debug mode is enabled and this logger is active.
   *
   * @param message - The log message
   * @param v - Additional context values to log
   */
  log: (message: string, ...v: any) => void

  /**
   * Log an error message.
   *
   * The message is always stored in the message history.
   * It's only output to console if debug mode is enabled and this logger is active.
   *
   * @param message - The error message
   * @param v - Additional context values to log
   */
  error: (message: string, ...v: any) => void
}

export type LogMessage = {
  type: 'log' | 'error' | 'event'
  name: string
  date: string
  message: string
  context?: string
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
  /**
   * Whether debug mode is currently enabled.
   *
   * Persisted in storage and controls console output for all loggers.
   */
  isEnabled: ComputedRef<boolean>

  /**
   * Toggle debug mode on/off.
   *
   * When disabled, debug messages are still collected but not output to console.
   */
  toggle: () => void

  /**
   * Create a named debug logger.
   *
   * Each logger has a unique name that appears in console output and can be
   * individually enabled/disabled. The logger is automatically registered.
   *
   * @param name - Unique name for this logger (e.g., 'DomProvider', 'Animation')
   * @returns Logger instance with log and error methods
   */
  createLogger: (name: string) => DebugLogger

  /**
   * Register a debug overlay.
   *
   * Debug overlays are visual debugging tools that can be toggled on/off.
   * Examples include viewport visualization, rect debugging, etc.
   *
   * @param id - Unique identifier for the overlay
   * @param label - Human-readable label for the overlay
   */
  registerOverlay: (id: string, label: string) => void

  /**
   * Unregister a debug overlay.
   *
   * Removes an overlay from the available overlays list.
   *
   * @param id - Identifier of the overlay to remove
   */
  unregisterOverlay: (id: string) => void

  /**
   * List of all registered debug overlays with their active state.
   *
   * Each overlay includes whether it's currently visible.
   */
  overlays: ComputedRef<RegisteredDebugOverlay[]>

  /**
   * Toggle a debug overlay on/off.
   *
   * Active state is persisted in storage.
   *
   * @param id - Identifier of the overlay to toggle
   */
  toggleOverlay: (id: string) => void

  /**
   * List of all registered logger names.
   *
   * Includes all loggers created via createLogger().
   */
  registeredLoggers: ComputedRef<string[]>

  /**
   * List of currently enabled logger names.
   *
   * When empty, all loggers are active.
   * When non-empty, only listed loggers output to console.
   */
  enabledLoggers: ComputedRef<string[]>

  /**
   * Toggle a logger's enabled state.
   *
   * Adds or removes the logger from the enabled list.
   * State is persisted in storage.
   *
   * @param name - Name of the logger to toggle
   */
  toggleLogger: (name: string) => void

  /**
   * Get all collected debug messages.
   *
   * Returns messages from all loggers and events, regardless of enabled state.
   * Useful for debugging issues after they occur.
   *
   * @returns Array of all log messages with timestamps
   */
  getMessages: () => LogMessage[]
}

export default function (
  eventBus: BlokkliEventBus,
  storage: StorageProvider,
): DebugProvider {
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
