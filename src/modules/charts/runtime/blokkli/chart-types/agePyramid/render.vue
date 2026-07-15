<template>
  <ChartCanvas :option="option" />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import ChartCanvas from '../../../components/ChartCanvas/index.vue'
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
import { createNumberFormatter } from '../../../helpers/numberFormat'
import { useChartOption } from '../../../helpers/useChartOption'
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
  }
})

const option = useChartOption(() => {
  const o = opts.value
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const abs = (v: number) => Math.abs(v)
  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: props.isEditing ? false : undefined,
    grid: {
      containLabel: true,
      top: 50,
      left: 10,
      right: 10,
      // The value axis is horizontal here, so its title sits below — widen the
      // inset to clear labels and the bottom legend.
      bottom: props.valueAxisTitle ? 65 : 40,
    },
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      valueFormatter: (v: number) => valueFormatter(abs(v)),
    },
    legend: {
      left: 'center',
      bottom: 0,
      orient: 'horizontal',
      data: props.series.map((s) => s.name),
    },
    xAxis: {
      type: 'value' as const,
      name: props.valueAxisTitle,
      nameLocation: 'middle' as const,
      nameGap: 30,
      axisLabel: { formatter: (v: number) => valueFormatter(abs(v)) },
      splitLine: { show: true },
    },
    yAxis: {
      type: 'category' as const,
      name: props.categoryAxisTitle,
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
}, props)
</script>
