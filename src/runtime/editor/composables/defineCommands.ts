import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { Command } from '../features/command-palette/types'

export function defineCommands(cb: () => Command | Command[] | undefined) {
  const { commands } = useBlokkli()

  onMounted(() => {
    commands.add(cb)
  })

  onBeforeUnmount(() => {
    commands.remove(cb)
  })
}
