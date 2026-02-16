import { defineChartType } from './define'
import {
  xAxisOptions,
  buildXAxisLabelOptions,
  dataLabelsOptions,
  buildDataLabelsOptions,
  legendOptions,
  buildLegendOptions,
  gridOptions,
  buildGridOptions,
  strokeWidthOptions,
  buildStrokeWidthOptions,
  mergeShared,
} from './shared'

export default defineChartType(($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
    strokeWidthOptions($t),
  )
  return {
    id: 'line',
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
    optionDefaults: {
      curved: false,
      markers: false,
      ...shared.defaults,
    },
    buildChartOptions(ctx) {
      const strokeWidth = buildStrokeWidthOptions(ctx.typeOptions)
      return {
        stroke: {
          curve: ctx.typeOptions.curved ? 'smooth' : 'straight',
          ...strokeWidth.stroke,
        },
        markers: { size: ctx.typeOptions.markers ? 5 : 0 },
        xaxis: {
          categories: ctx.categories,
          ...buildXAxisLabelOptions(ctx.typeOptions),
        },
        ...buildDataLabelsOptions(ctx.typeOptions),
        ...buildLegendOptions(ctx.typeOptions),
        ...buildGridOptions(ctx.typeOptions),
      }
    },
    buildSeries(ctx) {
      return ctx.series.map((s) => ({ name: s.name, data: s.data }))
    },
    editor: {
      label: $t('chartsTypeLine', 'Line'),
      icon: 'bk_mdi_show_chart',
      options: {
        curved: {
          type: 'toggle',
          label: $t('chartsLineCurved', 'Smooth curves'),
          group: 'display',
        },
        markers: {
          type: 'toggle',
          label: $t('chartsLineMarkers', 'Show markers'),
          group: 'display',
        },
        ...shared.options,
      },
    },
  }
})
