import {
  type Ref,
  type ComputedRef,
  ref,
  readonly,
  onMounted,
  onBeforeUnmount,
  computed,
} from 'vue'
import type { KeyboardShortcut } from '#blokkli/types'
import type { BlokkliEventBus } from '../events'

type RegisteredShortcut = {
  key: string
  shortcut: KeyboardShortcut
}

export type KeyboardProvider = {
  /**
   * Whether the Space key is currently pressed.
   *
   * Commonly used to enable panning mode in the artboard.
   */
  isPressingSpace: Readonly<Ref<boolean>>

  /**
   * Whether Control/Meta key is currently pressed.
   *
   * Meta is Cmd on macOS, Ctrl on Windows/Linux.
   * Also true when CapsLock is active.
   */
  isPressingControl: Readonly<Ref<boolean>>

  /**
   * Whether the Shift key is currently pressed.
   */
  isPressingShift: Readonly<Ref<boolean>>

  /**
   * Update keyboard modifier state from a mouse/pointer event.
   *
   * Useful for updating modifier state during drag operations where
   * keyboard events might not fire.
   *
   * @param e - The mouse or pointer event
   */
  setShortcutStateFromEvent: (e: MouseEvent | PointerEvent) => void

  /**
   * List of all registered keyboard shortcuts.
   *
   * Shortcuts are registered by features, buttons, and actions to enable
   * keyboard navigation and commands.
   */
  shortcuts: ComputedRef<RegisteredShortcut[]>

  /**
   * Register a keyboard shortcut.
   *
   * Adds the shortcut to the global shortcuts list for display in help UI.
   *
   * @param shortcut - The keyboard shortcut configuration
   */
  registerShortcut: (shortcut: KeyboardShortcut) => void

  /**
   * Unregister a keyboard shortcut.
   *
   * Removes the shortcut from the global shortcuts list.
   *
   * @param shortcut - The keyboard shortcut to remove
   */
  unregisterShortcut: (shortcut: KeyboardShortcut) => void

  /**
   * Lock keyboard events.
   *
   * Prevents keyboard shortcuts from firing. Used when text input is focused
   * or dialogs are open to avoid unintended actions.
   *
   * @param id - Unique identifier for this lock
   */
  lockKeyboardEvents: (id: string) => void

  /**
   * Unlock keyboard events.
   *
   * Removes a keyboard lock, re-enabling shortcuts when all locks are removed.
   *
   * @param id - The lock identifier to remove
   */
  unlockKeyboardEvents: (id: string) => void
}

function getControlState(
  e: KeyboardEvent | MouseEvent | PointerEvent,
): boolean {
  if ('code' in e && e.code === 'CapsLock') {
    return true
  }

  return e.getModifierState('Control') || e.getModifierState('Meta')
}

export default function (eventBus: BlokkliEventBus): KeyboardProvider {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)
  const isPressingShift = ref(false)
  const registeredShortcuts = ref<RegisteredShortcut[]>([])
  const keyboardLocks = ref<string[]>([])
  const keyboardLocked = computed<boolean>(() => !!keyboardLocks.value.length)

  const onKeyUp = (e: KeyboardEvent) => {
    isPressingControl.value =
      e.getModifierState('Control') || e.getModifierState('Meta')

    isPressingShift.value = e.getModifierState('Shift')

    if (e.code === 'Space') {
      isPressingSpace.value = false
    }
    if (e.code === 'Control' || e.key === 'CapsLock') {
      isPressingControl.value = false
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (keyboardLocked.value) {
      return
    }

    isPressingControl.value = getControlState(e)

    isPressingShift.value = e.getModifierState('Shift')

    if (!isPressingSpace.value) {
      eventBus.emit('keyPressed', {
        code: e.key,
        shift: e.shiftKey,
        meta: e.ctrlKey || e.metaKey || isPressingControl.value,
        originalEvent: e,
      })
    }

    if (e.code === 'Space') {
      isPressingSpace.value = true
    }
  }

  /**
   * When the tab becomes inactive we set key modifier states to false.
   *
   * This solves a potential problem where someone might switch tabs using the
   * control key, which would keep CTRL being active when coming back to the
   * window, even though the key isn't being pressed anymore.
   */
  const onVisibilityChange = () => {
    isPressingControl.value = false
    isPressingSpace.value = false
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  const getShortcutKey = (shortcut: KeyboardShortcut) =>
    [!!shortcut.meta, !!shortcut.shift, shortcut.code].join('-')

  const registerShortcut = (shortcut: KeyboardShortcut) => {
    registeredShortcuts.value.push({ key: getShortcutKey(shortcut), shortcut })
  }

  const unregisterShortcut = (shortcut: KeyboardShortcut) => {
    const key = getShortcutKey(shortcut)
    registeredShortcuts.value = registeredShortcuts.value.filter(
      (v) => v.key !== key,
    )
  }

  const shortcuts = computed(() => registeredShortcuts.value)

  function setShortcutStateFromEvent(e: MouseEvent | PointerEvent) {
    isPressingControl.value = getControlState(e)
    isPressingShift.value = !!e.shiftKey
  }

  function lockKeyboardEvents(id: string) {
    if (keyboardLocks.value.includes(id)) {
      return
    }

    keyboardLocks.value.push(id)
  }

  function unlockKeyboardEvents(id: string) {
    keyboardLocks.value = keyboardLocks.value.filter((v) => v !== id)
  }

  return {
    isPressingSpace: readonly(isPressingSpace),
    isPressingControl: readonly(isPressingControl),
    isPressingShift: readonly(isPressingShift),
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    setShortcutStateFromEvent,
    lockKeyboardEvents,
    unlockKeyboardEvents,
  }
}
