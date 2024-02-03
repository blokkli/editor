<template>
  <ArtboardManager
    v-if="useArtboard"
    :persist="settings.persist"
    :scroll-speed="settings.scrollSpeed"
  />
</template>

<script lang="ts" setup>
import type { ScrollIntoViewEvent } from '#blokkli/types'
import {
  computed,
  useBlokkli,
  onMounted,
  onBeforeUnmount,
  watch,
  defineBlokkliFeature,
} from '#imports'
import ArtboardManager from './Manager/index.vue'

const { settings } = defineBlokkliFeature({
  id: 'artboard',
  label: 'Artboard',
  icon: 'artboard',
  description:
    'Wraps the entire page in an artboard that can be zoomed and moved using the mouse.',
  settings: {
    useArtboard: {
      type: 'radios',
      default: 'yes',
      label: 'Page editing',
      group: 'appearance',
      viewports: ['desktop'],
      options: {
        yes: {
          label: 'Use artboard',
          icon: 'artboard-enabled',
        },
        no: {
          label: 'Normal display',
          icon: 'artboard-disabled',
        },
      },
    },
    persist: {
      type: 'checkbox',
      default: true,
      label: 'Persist position and zoom',
      group: 'behavior',
      viewports: ['desktop'],
    },
    scrollSpeed: {
      type: 'slider',
      default: 1,
      label: 'Artboard scroll speed',
      group: 'behavior',
      viewports: ['desktop'],
      min: 0.5,
      max: 1.5,
      step: 0.05,
    },
  },
  screenshot: 'feature-artboard.jpg',
})

const { ui, eventBus, dom } = useBlokkli()

const useArtboard = computed(
  () => settings.value.useArtboard === 'yes' && !ui.isMobile.value,
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
