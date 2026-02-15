<template>
  <div></div>
</template>

<script setup lang="ts">
import { onBlokkliEvent } from '#blokkli/editor/composables'
import { defineBlokkliFeature, ref } from '#imports'

const { adapter } = defineBlokkliFeature({
  id: 'charts',
  icon: 'bk_mdi_area_chart',
  label: 'Charts',
  description: 'Add and edit interactive charts.',
})

const chartBeingEdited = ref<string | null>(null)

onBlokkliEvent('fragment:edit', (data) => {
  if (data.name === 'blokkli_chart') {
    chartBeingEdited.value = data.uuid
    console.log('CHARTS!')
  } else {
    chartBeingEdited.value = null
  }
})
</script>
