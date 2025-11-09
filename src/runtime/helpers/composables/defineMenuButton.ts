import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { MenuButtonPlugin } from '../pluginProvider'

export default function (
  cb: () => MenuButtonPlugin | MenuButtonPlugin[] | undefined,
) {
  const { plugins } = useBlokkli()

  onMounted(() => {
    plugins.addMenuButton(cb)
  })

  onBeforeUnmount(() => {
    plugins.removeMenuButton(cb)
  })
}
