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
  return {
    stacked: t.stacked ?? false,
    horizontal: t.horizontal ?? false,
    xaxisRotation: t.xaxisRotation ?? 'auto',
    dataLabels: t.dataLabels ?? false,
    yaxisMin:
      typeof t.yaxisMin === 'number' && Number.isFinite(t.yaxisMin)
        ? t.yaxisMin
        : undefined,
    categoryFilter: t.categoryFilter === true,
  }
})

const option = useChartOption(() => {
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
    splitLine: { show: true },
  }
  if (o.yaxisMin !== undefined) {
    valueAxis.min = o.yaxisMin
  }
  const xAxis = o.horizontal ? valueAxis : categoryAxis
  const yAxis = o.horizontal ? categoryAxis : valueAxis
  if (props.categoryAxisTitle) categoryAxis.name = props.categoryAxisTitle
  if (props.valueAxisTitle) valueAxis.name = props.valueAxisTitle
  // Neutral placement: centre a title under the horizontal axis (the vertical
  // axis keeps ECharts' default top placement) and widen the bottom inset so it
  // clears the labels and the bottom legend. Fine placement is the transform's.
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
      show: !o.categoryFilter,
      left: 'center',
      bottom: 0,
      orient: 'horizontal',
      data: props.series.map((s) => s.name),
    },
    xAxis,
    yAxis,
    series: props.series.map((s, i) => {
      const useCategoryColors =
        o.categoryFilter &&
        props.series.length === 1 &&
        props.categoryHexColors.length === s.data.length
      return {
        type: 'bar' as const,
        name: s.name,
        data: useCategoryColors
          ? s.data.map((value, di) => ({
              value,
              itemStyle: { color: props.categoryHexColors[di] },
            }))
          : s.data,
        stack: o.stacked ? 'total' : undefined,
        itemStyle: useCategoryColors
          ? undefined
          : { color: props.seriesHexColors[i] },
        label: {
          show: o.dataLabels,
          formatter: (p: { value: number }) => valueFormatter(p.value),
        },
      }
    }),
  }
}, props)
</script>
