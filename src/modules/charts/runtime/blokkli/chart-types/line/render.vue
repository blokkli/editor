<template>
  <VChart :option="option" autoresize style="height: 550px; width: 100%" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
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
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const opts = computed(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  return {
    curved: t.curved ?? false,
    markers: t.markers ?? false,
    xaxisRotation: t.xaxisRotation ?? 'auto',
    dataLabels: t.dataLabels ?? false,
    gridLines: t.gridLines ?? true,
    legendPosition: t.legendPosition ?? 'bottom',
    strokeWidth: Number(t.strokeWidth ?? 2) || 2,
    yaxisMin:
      typeof t.yaxisMin === 'number' && Number.isFinite(t.yaxisMin)
        ? t.yaxisMin
        : undefined,
  }
})

const option = computed(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const xAxis: Record<string, unknown> = {
    type: 'category',
    data: props.categories,
    boundaryGap: false,
  }
  if (o.xaxisRotation !== 'auto') {
    xAxis.axisLabel = { rotate: Number(o.xaxisRotation) }
  }
  const yAxis: Record<string, unknown> = {
    type: 'value',
    axisLabel: { formatter: (v: number) => valueFormatter(v) },
    splitLine: { show: o.gridLines },
  }
  if (o.yaxisMin !== undefined) yAxis.min = o.yaxisMin
  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: !props.isEditing,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: number) => valueFormatter(v),
    },
    legend: {
      ...legendPositionToEcharts(o.legendPosition),
      data: props.series.map((s) => s.name),
    },
    grid: { containLabel: true, top: 50, left: 10, right: 10, bottom: 40 },
    xAxis,
    yAxis,
    series: props.series.map((s, i) => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: o.curved,
      showSymbol: o.markers,
      symbolSize: 6,
      lineStyle: { width: o.strokeWidth, color: props.seriesHexColors[i] },
      itemStyle: { color: props.seriesHexColors[i] },
      label: {
        show: o.dataLabels,
        formatter: (p: { value: number }) => valueFormatter(p.value),
      },
    })),
  }
})
</script>
