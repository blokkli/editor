<template>
  <Overlay v-if="tour.isTouring.value" @close="stopTour" />
  <Popup
    id="tour"
    theme="warning"
    position="top-left"
    :title="$t('tourLabel', 'Take a tour')"
    :text="
      $t(
        'tourIntro',
        'Explore the most important features of the editor and learn how to get started using blökkli.',
      )
    "
    :cta="$t('tourStartButton', 'Start the tour')"
    @submit="startTour"
  />
</template>

<script lang="ts" setup>
import { defineBlokkliFeature, useBlokkli } from '#imports'
import Overlay from './Overlay/index.vue'
import { defineMenuButton } from '#blokkli/editor/composables'
import { Popup } from '#blokkli/editor/components'

defineBlokkliFeature({
  id: 'tour',
  label: 'Tour',
  icon: 'bk_mdi_school-fill',
  description: 'Provides a tour overlay to get to know the editor.',
})

const { tour, $t } = useBlokkli()

function startTour() {
  tour.isTouring.value = true
}

function stopTour() {
  tour.isTouring.value = false
}

defineMenuButton(() => {
  return {
    id: 'tour',
    title: $t('tourLabel', 'Take a tour'),
    description: $t('tourDescription', 'Explore the features of the editor'),
    icon: 'bk_mdi_school-fill',
    secondary: true,
    weight: -10,
    callback: startTour,
  }
})
</script>

<script lang="ts">
export default {
  name: 'Tour',
}
</script>
