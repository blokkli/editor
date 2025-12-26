import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { MenuButtonPlugin } from '../../helpers/providers/plugin'

export function defineMenuButton(
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
