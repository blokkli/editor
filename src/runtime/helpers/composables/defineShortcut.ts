import type { KeyboardShortcut } from '#blokkli/types'
import { onBeforeUnmount, onMounted } from '#imports'
import { useBlokkli } from '../../composables/useBlokkli'

export default function (shortcut: KeyboardShortcut[] | KeyboardShortcut) {
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
