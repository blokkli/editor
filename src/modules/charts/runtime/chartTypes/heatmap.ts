import { defineChartType } from './define'
import {
  xAxisOptions,
  buildXAxisLabelOptions,
  legendOptions,
  buildLegendOptions,
  gridOptions,
  buildGridOptions,
  mergeShared,
} from './shared'
import { createNumberFormatter } from '../helpers/numberFormat'
import type {
  XAxisTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
} from './shared'

export type TypeOptions = XAxisTypeOptions & LegendTypeOptions & GridTypeOptions

export default defineChartType<TypeOptions>(($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    legendOptions($t),
    gridOptions($t),
  )
  return {
    id: 'heatmap',
    hasMultipleSeries: true,
    hasSeriesColors: false,
    hasCategoryColors: false,
    buildChartOptions(ctx) {
      const formatter = createNumberFormatter(ctx.numberFormat)
      return {
        dataLabels: { enabled: true, formatter },
        plotOptions: {
          heatmap: {
            colorScale: { ranges: [] },
          },
        },
        xaxis: {
          ...buildXAxisLabelOptions(ctx.typeOptions),
        },
        tooltip: { y: { formatter } },
        ...buildLegendOptions(ctx.typeOptions),
        ...buildGridOptions(ctx.typeOptions),
      }
    },
    buildSeries(ctx) {
      return ctx.series.map((s) => ({
        name: s.name,
        data: s.data.map((value, i) => ({
          x: ctx.categories[i] || '',
          y: value,
        })),
      }))
    },
    editor: {
      label: $t('chartsTypeHeatmap', 'Heatmap'),
      description: $t(
        'chartsTypeHeatmapDescription',
        'Visualises values across two dimensions using colour intensity to reveal patterns and outliers.',
      ),
      icon: 'bk_mdi_grid_view',
      options: {
        ...shared.options,
      },
    },
  }
})
