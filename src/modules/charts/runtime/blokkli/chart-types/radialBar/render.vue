<template>
  <VChart :option="option" autoresize style="height: 550px; width: 100%" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  PolarComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '#blokkli/charts/types'
import { createNumberFormatter } from '../../../helpers/numberFormat'
import type { TypeOptions } from './definition'

use([
  CanvasRenderer,
  BarChart,
  PolarComponent,
  TooltipComponent,
  TitleComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const option = computed(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  const showLabels = t.showLabels ?? true
  const values = props.series[0]?.data ?? []
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const max = Math.max(0, ...values.map((v) => v ?? 0))

  const data = props.categories.map((name, i) => ({
    name,
    value: values[i] ?? 0,
    itemStyle: { color: props.categoryHexColors[i] },
  }))

  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: !props.isEditing,
    polar: { radius: ['20%', '70%'] },
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { name: string; value: number }) =>
        `${p.name}: ${valueFormatter(p.value)}`,
    },
    angleAxis: { max: max || 1, startAngle: 90, show: false },
    radiusAxis: {
      type: 'category' as const,
      data: props.categories,
      axisLabel: { show: showLabels },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        coordinateSystem: 'polar' as const,
        data,
        roundCap: true,
        label: {
          show: showLabels,
          position: 'middle' as const,
          formatter: (p: { value: number }) => valueFormatter(p.value),
        },
      },
    ],
  }
})
</script>
