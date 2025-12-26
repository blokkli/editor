import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { ItemDropdownAction } from '../providers/plugin'

export function defineItemDropdownAction(
  cb: () => ItemDropdownAction | ItemDropdownAction[] | undefined,
) {
  const { plugins } = useBlokkli()

  onMounted(() => {
    plugins.add('itemDropdownAction', cb)
  })

  onBeforeUnmount(() => {
    plugins.remove('itemDropdownAction', cb)
  })
}
