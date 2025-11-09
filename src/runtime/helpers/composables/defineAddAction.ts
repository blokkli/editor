import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { AddAction } from '#blokkli/types'

export default function (cb: () => AddAction | AddAction[] | undefined) {
  const { plugins } = useBlokkli()

  onMounted(() => {
    plugins.add('addAction', cb)
  })

  onBeforeUnmount(() => {
    plugins.remove('addAction', cb)
  })
}
