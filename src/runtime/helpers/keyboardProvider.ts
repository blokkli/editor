import {
  type Ref,
  type ComputedRef,
  ref,
  readonly,
  onMounted,
  onBeforeUnmount,
  watch,
  computed,
} from 'vue'
import type { AnimationProvider } from './animationProvider'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { KeyboardShortcut } from '#blokkli/types'

type RegisteredShortcut = {
  key: string
  shortcut: KeyboardShortcut
}

export type KeyboardProvider = {
  isPressingSpace: Readonly<Ref<boolean>>
  isPressingControl: Readonly<Ref<boolean>>
  isPressingShift: Readonly<Ref<boolean>>
  setShortcutStateFromEvent: (e: MouseEvent | PointerEvent) => void
  shortcuts: ComputedRef<RegisteredShortcut[]>
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (shortcut: KeyboardShortcut) => void
}

function getControlState(
  e: KeyboardEvent | MouseEvent | PointerEvent,
): boolean {
  if ('code' in e && e.code === 'CapsLock') {
    return true
  }

  return e.getModifierState('Control') || e.getModifierState('Meta')
}

export default function (
  animationProvider: AnimationProvider,
): KeyboardProvider {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)
  const isPressingShift = ref(false)
  const registeredShortcuts = ref<RegisteredShortcut[]>([])

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

  watch(isPressingSpace, () => {
    animationProvider.requestDraw()
  })

  watch(isPressingControl, () => {
    animationProvider.requestDraw()
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

  return {
    isPressingSpace: readonly(isPressingSpace),
    isPressingControl: readonly(isPressingControl),
    isPressingShift: readonly(isPressingShift),
    shortcuts,
    registerShortcut,
    unregisterShortcut,
    setShortcutStateFromEvent,
  }
}
