<template>
  <VChart :option="option" autoresize style="height: 550px; width: 100%" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '#blokkli/charts/types'
import { legendPositionToEcharts } from '../../../helpers/echarts'
import { createNumberFormatter } from '../../../helpers/numberFormat'
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
    fillOpacity: Number(t.fillOpacity ?? 0.2) || 0.2,
    dataLabels: t.dataLabels ?? false,
    legendPosition: t.legendPosition ?? 'bottom',
  }
})

const option = computed(() => {
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
    animation: !props.isEditing,
    tooltip: {
      trigger: 'item' as const,
      valueFormatter: (v: number) => valueFormatter(v),
    },
    legend: {
      ...legendPositionToEcharts(o.legendPosition),
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
            opacity: o.fillOpacity,
          },
          label: {
            show: o.dataLabels,
            formatter: (p: { value: number }) => valueFormatter(p.value),
          },
        })),
      },
    ],
  }
})
</script>
