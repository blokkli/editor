import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { Command } from '#blokkli/types'

export default function (cb: () => Command | Command[]) {
  const { commands } = useBlokkli()

  onMounted(() => {
    commands.add(cb)
  })

  onBeforeUnmount(() => {
    commands.remove(cb)
  })
}
