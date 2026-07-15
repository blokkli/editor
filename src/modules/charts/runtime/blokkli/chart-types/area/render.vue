<template>
  <ChartCanvas :option="option" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import ChartCanvas from '../../../components/ChartCanvas/index.vue'
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
import { createNumberFormatter } from '../../../helpers/numberFormat'
import { useChartOption } from '../../../helpers/useChartOption'
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
    yaxisMin:
      typeof t.yaxisMin === 'number' && Number.isFinite(t.yaxisMin)
        ? t.yaxisMin
        : undefined,
  }
})

const option = useChartOption(() => {
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
    splitLine: { show: true },
  }
  if (o.yaxisMin !== undefined) yAxis.min = o.yaxisMin
  if (props.categoryAxisTitle) xAxis.name = props.categoryAxisTitle
  if (props.valueAxisTitle) yAxis.name = props.valueAxisTitle
  // Neutral placement: centre the category title under the (horizontal) x-axis;
  // the value axis keeps ECharts' default top placement. Transform can override.
  if (xAxis.name) {
    xAxis.nameLocation = 'middle'
    xAxis.nameGap = 30
  }
  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: props.isEditing ? false : undefined,
    grid: {
      containLabel: true,
      top: 50,
      left: 10,
      right: 10,
      bottom: xAxis.name ? 65 : 40,
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: number) => valueFormatter(v),
    },
    legend: {
      left: 'center',
      bottom: 0,
      orient: 'horizontal',
      data: props.series.map((s) => s.name),
    },
    xAxis,
    yAxis,
    series: props.series.map((s, i) => ({
      type: 'line' as const,
      name: s.name,
      data: s.data,
      smooth: o.curved,
      showSymbol: o.markers,
      symbolSize: 6,
      lineStyle: { width: 2, color: props.seriesHexColors[i] },
      itemStyle: { color: props.seriesHexColors[i] },
      areaStyle: { opacity: 0.4 },
      label: {
        show: o.dataLabels,
        formatter: (p: { value: number }) => valueFormatter(p.value),
      },
    })),
  }
}, props)
</script>
