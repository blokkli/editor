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
  buildValueFormatOptions,
  yAxisMinOptions,
  mergeShared,
} from './shared'
import type {
  XAxisTypeOptions,
  DataLabelsTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
  StrokeWidthTypeOptions,
  YAxisMinTypeOptions,
} from './shared'

export type TypeOptions = {
  curved: boolean
  markers: boolean
} & XAxisTypeOptions &
  DataLabelsTypeOptions &
  LegendTypeOptions &
  GridTypeOptions &
  StrokeWidthTypeOptions &
  YAxisMinTypeOptions

export default defineChartType<TypeOptions>(($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
    strokeWidthOptions($t),
    yAxisMinOptions($t),
  )
  return {
    id: 'line',
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
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
        ...buildDataLabelsOptions(ctx.typeOptions, ctx.numberFormat),
        ...buildValueFormatOptions(ctx.typeOptions, ctx.numberFormat),
        ...buildLegendOptions(ctx.typeOptions),
        ...buildGridOptions(ctx.typeOptions),
      }
    },
    buildSeries(ctx) {
      return ctx.series.map((s) => ({ name: s.name, data: s.data }))
    },
    editor: {
      label: $t('chartsTypeLine', 'Line'),
      description: $t(
        'chartsTypeLineDescription',
        'Connects data points with lines to show trends and changes across a continuous range.',
      ),
      icon: 'bk_mdi_show_chart',
      options: {
        curved: {
          type: 'checkbox',
          label: $t('chartsLineCurved', 'Smooth curves'),
          default: false,
          group: 'display',
        },
        markers: {
          type: 'checkbox',
          label: $t('chartsLineMarkers', 'Show markers'),
          default: false,
          group: 'display',
        },
        ...shared.options,
      },
    },
  }
})
