import {
  type Ref,
  type ComputedRef,
  ref,
  readonly,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue'
import { eventBus } from '#blokkli/helpers/eventBus'
import type { AnimationProvider } from './animationProvider'
import type { KeyboardShortcut } from '#blokkli/types'

type RegisteredShortcut = {
  key: string
  shortcut: KeyboardShortcut
}

export type KeyboardProvider = {
  isPressingSpace: Readonly<Ref<boolean>>
  isPressingControl: Readonly<Ref<boolean>>
  shortcuts: ComputedRef<RegisteredShortcut[]>
  registerShortcut: (shortcut: KeyboardShortcut) => void
  unregisterShortcut: (shortcut: KeyboardShortcut) => void
}

export default function (
  animationProvider: AnimationProvider,
): KeyboardProvider {
  const isPressingControl = ref(false)
  const isPressingSpace = ref(false)
  const registeredShortcuts = ref<RegisteredShortcut[]>([])

  const onKeyUp = (e: KeyboardEvent) => {
    isPressingControl.value =
      e.getModifierState('Control') || e.getModifierState('Meta')

    if (e.code === 'Space') {
      isPressingSpace.value = false
    }
    if (e.code === 'Control' || e.key === 'CapsLock') {
      isPressingControl.value = false
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    isPressingControl.value =
      e.getModifierState('Control') ||
      e.getModifierState('Meta') ||
      e.code === 'CapsLock'

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

  watch(isPressingSpace, (is) => {
    is
      ? document.body.classList.add('bk-is-pressing-space')
      : document.body.classList.remove('bk-is-pressing-space')
    animationProvider.requestDraw()
  })

  watch(isPressingControl, (is) => {
    is
      ? document.body.classList.add('bk-is-pressing-control')
      : document.body.classList.remove('bk-is-pressing-control')
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

  return {
    isPressingSpace: readonly(isPressingSpace),
    isPressingControl: readonly(isPressingControl),
    shortcuts,
    registerShortcut,
    unregisterShortcut,
  }
}
