<template>
  <Overlay v-if="tour.isTouring.value" @close="close" />
  <PluginMenuButton
    id="tour"
    :title="$t('tourLabel', 'Take a tour')"
    :description="$t('tourDescription', 'Explore the features of the editor')"
    icon="tutor"
    secondary
    :weight="-10"
    @click="show"
  />
</template>

<script lang="ts" setup>
import { defineBlokkliFeature, useBlokkli } from '#imports'
import Overlay from './Overlay/index.vue'
import { PluginMenuButton } from '#blokkli/plugins'

defineBlokkliFeature({
  id: 'tour',
  label: 'Tour',
  icon: 'tutor',
  description: 'Provides a tour overlay to get to know the editor.',
})

const { tour, $t } = useBlokkli()

const show = () => (tour.isTouring.value = true)
const close = () => (tour.isTouring.value = false)
</script>

<script lang="ts">
export default {
  name: 'Tour',
}
</script>
