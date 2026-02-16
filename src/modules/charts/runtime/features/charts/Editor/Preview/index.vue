<template>
  <div :class="{ 'bk-is-stale': stale }">
    <ChartRenderer v-if="data" v-bind="data" />
    <div v-else class="bk-chart-preview-placeholder">
      {{
        $t(
          'chartsPreviewPlaceholder',
          'Click "Refresh Preview" to see the chart.',
        )
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBlokkli } from '#imports'
import type { BlokkliChartData } from '../../../../types'
import ChartRenderer from '../../../../components/ChartRenderer/index.vue'

const { $t } = useBlokkli()

defineProps<{
  data: BlokkliChartData | null
  stale: boolean
}>()
</script>
