<template>
  <Teleport to="body">
    <Styleguide v-if="isVisible" @close="isVisible = false" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineBlokkliFeature, useRoute, useRouter } from '#imports'
import { defineMenuButton } from '#blokkli/editor/composables'
import Styleguide from './Styleguide/index.vue'

defineBlokkliFeature({
  id: 'styleguide',
  label: 'Styleguide',
  description: 'Browse blökkli editor components and their variants.',
  icon: 'bk_mdi_widgets',
  viewports: ['desktop'],
  devOnly: true,
})

const route = useRoute()
const router = useRouter()

const isVisible = computed({
  get() {
    return route.query.bkOverlay === 'styleguide'
  },
  set(isVisible) {
    if (isVisible) {
      router.replace({
        query: {
          ...route.query,
          bkOverlay: 'styleguide',
        },
      })
    } else {
      router.replace({
        query: {
          ...route.query,
          bkOverlay: undefined,
        },
      })
    }
  },
})

defineMenuButton(() => ({
  id: 'styleguide',
  title: 'Styleguide',
  description: 'Browse blökkli editor components and their variants.',
  icon: 'bk_mdi_widgets',
  weight: 900,
  secondary: true,
  callback: () => {
    isVisible.value = true
  },
}))
</script>

<script lang="ts">
export default {
  name: 'Styleguide',
}
</script>
