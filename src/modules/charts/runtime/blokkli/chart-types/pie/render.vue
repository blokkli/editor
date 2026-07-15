<template>
  <ChartCanvas :option="option" />
</template>

<script setup lang="ts">
import ChartCanvas from '../../../components/ChartCanvas/index.vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '#blokkli/charts/types'
import {
  createNumberFormatter,
  createPercentFormatter,
} from '../../../helpers/numberFormat'
import { useChartOption } from '../../../helpers/useChartOption'
import type { TypeOptions } from './definition'

use([
  CanvasRenderer,
  PieChart,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const option = useChartOption(() => {
  const t = props.typeOptions as Partial<TypeOptions>
  const showLabels = t.showLabels ?? true
  const values = props.series[0]?.data ?? []
  const valueFormatter = createNumberFormatter(props.numberFormat)
  const percentFormatter = createPercentFormatter(props.numberFormat)
  const data = props.categories.map((name, i) => ({
    name,
    value: values[i] ?? 0,
    itemStyle: { color: props.categoryHexColors[i] },
  }))
  return {
    title: props.title ? { text: props.title, left: 'left' } : undefined,
    animation: props.isEditing ? false : undefined,
    tooltip: {
      trigger: 'item' as const,
      valueFormatter: (v: number) => valueFormatter(v),
    },
    legend: { left: 'center', bottom: 0, orient: 'horizontal' },
    series: [
      {
        type: 'pie' as const,
        radius: '60%',
        center: ['50%', '50%'],
        data,
        label: {
          show: showLabels,
          formatter: (p: { percent: number }) => percentFormatter(p.percent),
        },
      },
    ],
  }
}, props)
</script>
