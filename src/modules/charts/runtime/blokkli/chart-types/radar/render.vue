<template>
  <ChartCanvas :option="option" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import ChartCanvas from '../../../components/ChartCanvas/index.vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '#blokkli/charts/types'
import { createNumberFormatter } from '../../../helpers/numberFormat'
import { useChartOption } from '../../../helpers/useChartOption'
import type { TypeOptions } from './definition'

use([
  CanvasRenderer,
  RadarChart,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const opts = computed(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  return {
    markers: t.markers ?? false,
    dataLabels: t.dataLabels ?? false,
  }
})

const option = useChartOption(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)

  // Indicator max = max value across all series for each category.
  const indicators = props.categories.map((name, i) => {
    let max = 0
    for (const s of props.series) {
      const v = s.data[i] ?? 0
      if (v > max) max = v
    }
    return { name, max: max > 0 ? max : 1 }
  })

  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: props.isEditing ? false : undefined,
    tooltip: {
      trigger: 'item' as const,
      valueFormatter: (v: number) => valueFormatter(v),
    },
    legend: {
      left: 'center',
      bottom: 0,
      orient: 'horizontal',
      data: props.series.map((s) => s.name),
    },
    radar: {
      indicator: indicators,
      center: ['50%', '52%'],
      radius: '65%',
    },
    series: [
      {
        type: 'radar' as const,
        symbol: o.markers ? ('circle' as const) : ('none' as const),
        symbolSize: 5,
        data: props.series.map((s, i) => ({
          name: s.name,
          value: s.data,
          itemStyle: { color: props.seriesHexColors[i] },
          lineStyle: { color: props.seriesHexColors[i] },
          areaStyle: {
            color: props.seriesHexColors[i],
            opacity: 0.2,
          },
          label: {
            show: o.dataLabels,
            formatter: (p: { value: number }) => valueFormatter(p.value),
          },
        })),
      },
    ],
  }
}, props)
</script>
