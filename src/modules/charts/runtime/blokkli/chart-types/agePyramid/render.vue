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
  const rawSplit = Number(t.splitIndex)
  const defaultSplit = Math.ceil(props.series.length / 2)
  const split = Number.isFinite(rawSplit) ? rawSplit : defaultSplit
  return {
    splitIndex: Math.max(0, Math.min(props.series.length, split)),
    dataLabels: t.dataLabels ?? false,
    gridLines: t.gridLines ?? true,
    legendPosition: t.legendPosition ?? 'bottom',
  }
})

const option = computed(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const abs = (v: number) => Math.abs(v)
  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: !props.isEditing,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      valueFormatter: (v: number) => valueFormatter(abs(v)),
    },
    legend: {
      ...legendPositionToEcharts(o.legendPosition),
      data: props.series.map((s) => s.name),
    },
    grid: { containLabel: true, top: 50, left: 10, right: 10, bottom: 40 },
    xAxis: {
      type: 'value' as const,
      axisLabel: { formatter: (v: number) => valueFormatter(abs(v)) },
      splitLine: { show: o.gridLines },
    },
    yAxis: {
      type: 'category' as const,
      data: props.categories,
      axisTick: { alignWithLabel: true },
    },
    series: props.series.map((s, i) => {
      const isLeft = i < o.splitIndex
      return {
        type: 'bar' as const,
        name: s.name,
        stack: 'pyramid',
        data: isLeft ? s.data.map((v) => -v) : s.data,
        itemStyle: { color: props.seriesHexColors[i] },
        emphasis: { focus: 'series' as const },
        label: {
          show: o.dataLabels,
          formatter: (p: { value: number }) => valueFormatter(abs(p.value)),
        },
      }
    }),
  }
})
</script>
