import { computed, onBeforeUnmount, onMounted, useBlokkli } from '#imports'
import type { ComputedRef } from 'vue'
import type { ViewOption } from '../providers/plugin'

export function defineViewOption(options: ViewOption): {
  isVisible: ComputedRef<boolean>
} {
  const { storage, ui, plugins } = useBlokkli()
  const isActive = storage.use(
    'view_option_' + options.id,
    !!options.default,
    true,
  )
  const isVisible = computed(() => isActive.value && !ui.isMobile.value)
  const cb = () => options

  onMounted(() => plugins.add('viewOption', cb))
  onBeforeUnmount(() => plugins.remove('viewOption', cb))

  return { isVisible }
}
