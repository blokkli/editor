<template>
  <ArtboardManager v-if="useArtboard" />
</template>

<script lang="ts" setup>
import type { ScrollIntoViewEvent } from '#blokkli/types'
import {
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  watch,
  defineBlokkliFeature,
} from '#imports'
import ArtboardManager from './Manager/index.vue'

defineBlokkliFeature({
  description:
    'Wraps the entire page in an artboard that can be zoomed and moved using the mouse.',
})

const { storage, ui, eventBus, dom } = useBlokkli()

const useArtboardSetting = storage.use('useArtboard', true)

const useArtboard = computed(
  () => useArtboardSetting.value && !ui.isMobile.value,
)

/**
 * Handler is only executed when the artboard is not mounted.
 */
const onScrollIntoView = (e: ScrollIntoViewEvent) => {
  const item = dom.findBlock(e.uuid)
  if (!item) {
    return
  }

  const options: ScrollIntoViewOptions = {}

  if (e.center) {
    options.block = 'center'
  }

  options.behavior = e.immediate ? 'instant' : 'smooth'

  item.element().scrollIntoView(options)
}

const setFallback = () => {
  eventBus.off('scrollIntoView', onScrollIntoView)
  if (!useArtboard.value) {
    eventBus.on('scrollIntoView', onScrollIntoView)
  }
}

watch(useArtboard, () => setFallback())
onMounted(() => setFallback())

onBeforeUnmount(() => {
  eventBus.off('scrollIntoView', onScrollIntoView)
})
</script>

<script lang="ts">
export default {
  name: 'Artboard',
}
</script>
