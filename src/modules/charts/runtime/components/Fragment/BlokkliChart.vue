<template>
  <div class="blokkli-fragment-chart">
    <ChartRenderer v-if="data && data.series?.length > 0" v-bind="data" />
    <div v-else>Missing chart data.</div>
  </div>
</template>

<script setup lang="ts">
import { defineBlokkliFragment, computed } from '#imports'
import type { BlokkliChartData } from '../../types'
import ChartRenderer from './../ChartRenderer/index.vue'

const { options } = defineBlokkliFragment({
  name: 'blokkli_chart',
  label: 'Chart',
  description: 'Create interactive charts.',
  editor: {
    previewWidth: 1200,
  },
  options: {
    data: {
      type: 'json',
      label: 'The chart data.',
      default: '{}',
    },
  },
})

const data = computed<BlokkliChartData | null>(() => {
  return options.value.data
})
</script>
