import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { MenuButtonPlugin } from '../pluginProvider'

export default function (
  cb: () => MenuButtonPlugin | MenuButtonPlugin[] | undefined,
) {
  const { plugins } = useBlokkli()

  onMounted(() => {
    plugins.add('menuButton', cb)
  })

  onBeforeUnmount(() => {
    plugins.remove('menuButton', cb)
  })
}
