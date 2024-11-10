<template>
  <ArtboardManager
    :persist="settings.persist"
    :momentum="settings.momentum"
    :scroll-speed="settings.scrollSpeed"
  />
</template>

<script lang="ts" setup>
import ArtboardManager from './Manager/index.vue'
import { defineBlokkliFeature } from '#imports'

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
      group: 'artboard',
      viewports: ['desktop'],
    },
    momentum: {
      type: 'checkbox',
      default: true,
      label: 'Use smooth scrolling',
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
</script>

<script lang="ts">
export default {
  name: 'Artboard',
}
</script>
