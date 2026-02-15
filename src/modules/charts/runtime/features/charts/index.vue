<template>
  <div></div>
</template>

<script setup lang="ts">
import { defineBlokkliFeature } from '#imports'

const { adapter } = defineBlokkliFeature({
  id: 'charts',
  icon: 'bk_mdi_area_chart',
  label: 'Charts',
  description: 'Add and edit interactive charts.',
})
</script>
