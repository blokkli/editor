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
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const opts = computed(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  return {
    stacked: t.stacked ?? false,
    horizontal: t.horizontal ?? false,
    borderRadius: Number(t.borderRadius ?? 0) || 0,
    xaxisRotation: t.xaxisRotation ?? 'auto',
    dataLabels: t.dataLabels ?? false,
    gridLines: t.gridLines ?? true,
    legendPosition: t.legendPosition ?? 'bottom',
    yaxisMin:
      typeof t.yaxisMin === 'number' && Number.isFinite(t.yaxisMin)
        ? t.yaxisMin
        : undefined,
  }
})

const option = computed(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const categoryAxis: Record<string, unknown> = {
    type: 'category',
    data: props.categories,
  }
  if (o.xaxisRotation !== 'auto') {
    categoryAxis.axisLabel = { rotate: Number(o.xaxisRotation) }
  }
  const valueAxis: Record<string, unknown> = {
    type: 'value',
    axisLabel: { formatter: (v: number) => valueFormatter(v) },
    splitLine: { show: o.gridLines },
  }
  if (o.yaxisMin !== undefined) {
    valueAxis.min = o.yaxisMin
  }
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
    xAxis: o.horizontal ? valueAxis : categoryAxis,
    yAxis: o.horizontal ? categoryAxis : valueAxis,
    series: props.series.map((s, i) => ({
      type: 'bar' as const,
      name: s.name,
      data: s.data,
      stack: o.stacked ? 'total' : undefined,
      itemStyle: {
        color: props.seriesHexColors[i],
        borderRadius: o.borderRadius,
      },
      label: {
        show: o.dataLabels,
        formatter: (p: { value: number }) => valueFormatter(p.value),
      },
    })),
  }
})
</script>
