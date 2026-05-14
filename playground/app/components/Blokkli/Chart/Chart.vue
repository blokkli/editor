<template>
  <div class="container mx-auto my-20">
    <ChartRenderer
      v-if="hasRenderableData"
      v-bind="chartData!"
      :dynamic-data="dynamicData"
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
import { defineBlokkli, computed, ref, watch } from '#imports'
import { ChartRenderer } from '#blokkli/charts/components'
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'

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

const chartData = computed<BlokkliChartData | null>(() => options.value.data)

const sourceId = computed(() => chartData.value?.dataSource?.id)

const dynamicData = ref<ChartDataSourcePayload | null>(null)

watch(
  sourceId,
  async (id) => {
    if (!id) {
      dynamicData.value = null
      return
    }
    if (import.meta.server) return
    try {
      dynamicData.value = await $fetch<ChartDataSourcePayload>(
        `/api/mock-chart-data/${id}`,
      )
    } catch {
      dynamicData.value = null
    }
  },
  { immediate: true },
)

const hasRenderableData = computed(() => {
  if (!chartData.value) return false
  // For dynamic sources, defer to ChartRenderer — it falls back to the
  // editor preview inject when this component is rendered inside the
  // editor's preview pane and the runtime fetch hasn't completed yet.
  if (chartData.value.dataSource) return true
  return (chartData.value.series?.length ?? 0) > 0
})
</script>
