<template>
  <div class="container mx-auto my-20">
    <ChartRenderer
      v-if="chartData && chartData.series?.length > 0"
      v-bind="chartData"
    />
    <div
      v-else
      class="p-20 text-center text-mono-400 border border-dashed border-mono-300 rounded"
    >
      No chart data. Click "Edit chart" to add data.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { ChartRenderer } from '#blokkli/charts/components'
import type { BlokkliChartData } from '#blokkli/charts/types'

const { options } = defineBlokkli({
  bundle: 'chart',
  options: {
    data: {
      type: 'json',
      label: 'Chart data',
      default: '{}',
      dataType: 'chart',
    },
  },
  editor: {
    previewWidth: 800,
    icon: 'bk_mdi_area_chart',
    addBehaviour: 'complex-option:data',
    disableEdit: true,
  },
})

export type Props = Record<string, never>

const chartData = computed<BlokkliChartData | null>(() => {
  return options.value.data
})
</script>
