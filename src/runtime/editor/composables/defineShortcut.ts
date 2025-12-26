import type { KeyboardShortcut } from '#blokkli/types'
import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'

export function defineShortcut(
  shortcut: KeyboardShortcut[] | KeyboardShortcut,
) {
  const { keyboard } = useBlokkli()
  onMounted(() => {
    if (Array.isArray(shortcut)) {
      shortcut.forEach((v) => keyboard.registerShortcut(v))
      return
    }
    keyboard.registerShortcut(shortcut)
  })

  onBeforeUnmount(() => {
    if (Array.isArray(shortcut)) {
      shortcut.forEach((v) => keyboard.unregisterShortcut(v))
      return
    }
    keyboard.unregisterShortcut(shortcut)
  })
}
