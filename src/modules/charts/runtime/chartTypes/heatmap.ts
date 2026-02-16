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

export default defineChartType(($t) => {
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
    optionDefaults: { ...shared.defaults },
    buildChartOptions(ctx) {
      return {
        dataLabels: { enabled: true },
        plotOptions: {
          heatmap: {
            colorScale: { ranges: [] },
          },
        },
        xaxis: {
          ...buildXAxisLabelOptions(ctx.typeOptions),
        },
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
      icon: 'bk_mdi_grid_view',
      options: {
        ...shared.options,
      },
    },
  }
})
