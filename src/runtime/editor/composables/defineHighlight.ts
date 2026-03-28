import { onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { HighlightItem } from '../providers/plugin'

export function defineHighlight(
  cb: () => HighlightItem | HighlightItem[] | undefined,
) {
  const { plugins } = useBlokkli()

  onMounted(() => {
    plugins.add('highlight', cb)
  })

  onBeforeUnmount(() => {
    plugins.remove('highlight', cb)
  })
}
