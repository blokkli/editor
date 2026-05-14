<template>
  <VChart :option="option" autoresize style="height: 550px; width: 100%" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '../../../chart-types/componentProps'
import { createNumberFormatter } from '../../../helpers/numberFormat'
import type { TypeOptions } from './definition'

use([
  CanvasRenderer,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const opts = computed(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  return {
    xaxisRotation: t.xaxisRotation ?? 'auto',
    gridLines: t.gridLines ?? true,
  }
})

const option = computed(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)

  const data: [number, number, number][] = []
  let min = Infinity
  let max = -Infinity
  for (let y = 0; y < props.series.length; y++) {
    const row = props.series[y]
    if (!row) continue
    for (let x = 0; x < props.categories.length; x++) {
      const value = row.data[x] ?? 0
      data.push([x, y, value])
      if (value < min) min = value
      if (value > max) max = value
    }
  }
  if (!Number.isFinite(min)) min = 0
  if (!Number.isFinite(max)) max = 1

  const xAxis: Record<string, unknown> = {
    type: 'category',
    data: props.categories,
    splitArea: { show: o.gridLines },
  }
  if (o.xaxisRotation !== 'auto') {
    xAxis.axisLabel = { rotate: Number(o.xaxisRotation) }
  }

  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: !props.isEditing,
    tooltip: {
      position: 'top' as const,
      formatter: (p: { data: [number, number, number] }) => {
        const [x, y, v] = p.data
        const cat = props.categories[x] ?? ''
        const row = props.series[y]?.name ?? ''
        return `${row} / ${cat}: ${valueFormatter(v)}`
      },
    },
    grid: { containLabel: true, top: 50, left: 10, right: 50, bottom: 60 },
    xAxis,
    yAxis: {
      type: 'category',
      data: props.series.map((s) => s.name),
      splitArea: { show: o.gridLines },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal' as const,
      left: 'center',
      bottom: 0,
      formatter: (v: number) => valueFormatter(v),
    },
    series: [
      {
        type: 'heatmap' as const,
        data,
        label: {
          show: true,
          formatter: (p: { data: [number, number, number] }) =>
            valueFormatter(p.data[2]),
        },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
        },
      },
    ],
  }
})
</script>
