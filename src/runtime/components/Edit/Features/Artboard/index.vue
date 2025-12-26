<template>
  <Renderer
    v-if="renderArtboard"
    :persist="settings.persist"
    :momentum="settings.momentum"
    :scroll-speed="settings.scrollSpeed"
  />
</template>

<script lang="ts" setup>
import { computed, useBlokkli, defineBlokkliFeature } from '#imports'

import Renderer from './Renderer.vue'
import { defineShortcut } from '#blokkli/editor/composables'

const { settings } = defineBlokkliFeature({
  id: 'artboard',
  label: 'Artboard',
  icon: 'artboard',
  description:
    'Wraps the entire page in an artboard that can be zoomed and moved using the mouse.',
  settings: {
    persist: {
      type: 'checkbox',
      default: true,
      label: 'Persist position and zoom',
      description:
        'Stores and restores the last position and zoom factor of the artboard.',
      group: 'artboard',
      viewports: ['desktop'],
    },
    momentum: {
      type: 'checkbox',
      default: true,
      label: 'Use smooth scrolling',
      description:
        'Applies smooth animations when scrolling or zooming the artboard.',
      group: 'artboard',
      viewports: ['desktop'],
    },
    scrollSpeed: {
      type: 'slider',
      default: 1,
      label: 'Artboard scroll speed',
      group: 'artboard',
      viewports: ['desktop'],
      min: 0.5,
      max: 1.5,
      step: 0.05,
    },
  },
  screenshot: 'feature-artboard.jpg',
})

const { ui, $t } = useBlokkli()

const renderArtboard = computed(() => !ui.isAnalyzing.value)

defineShortcut(
  [
    {
      code: 'Home',
      label: $t('artboardScrollToTop', 'Scroll to top'),
    },
    {
      code: 'End',
      label: $t('artboardScrollToEnd', 'Scroll to end'),
    },
    {
      code: 'PageUp',
      label: $t('artboardScrollOnePageUp', 'Scroll one page up'),
    },
    {
      code: 'PageDown',
      label: $t('artboardScrollOnePageDown', 'Scroll one page down'),
    },
    {
      code: 'ArrowUp',
      label: $t('artboardScrollUp', 'Scroll up'),
    },
    {
      code: 'ArrowDown',
      label: $t('artboardScrollDown', 'Scroll down'),
    },
    {
      code: '1',
      label: $t('artboardScaleToFit', 'Scale to fit'),
      meta: true,
    },
  ].map((v) => {
    return { ...v, group: $t('artboard', 'Artboard') }
  }),
)
</script>

<script lang="ts">
export default {
  name: 'Artboard',
}
</script>
