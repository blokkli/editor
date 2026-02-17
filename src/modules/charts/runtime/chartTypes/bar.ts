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
  mergeShared,
} from './shared'

export default defineChartType(($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
  )
  return {
    id: 'bar',
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
    buildChartOptions(ctx) {
      return {
        chart: { stacked: !!ctx.typeOptions.stacked },
        plotOptions: {
          bar: {
            horizontal: !!ctx.typeOptions.horizontal,
            borderRadius: Number(ctx.typeOptions.borderRadius) || 0,
          },
        },
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
      label: $t('chartsTypeBar', 'Bar'),
      icon: 'bk_mdi_bar_chart',
      options: {
        stacked: {
          type: 'checkbox',
          label: $t('chartsBarStacked', 'Stacked'),
          default: false,
          group: 'display',
        },
        horizontal: {
          type: 'checkbox',
          label: $t('chartsBarHorizontal', 'Horizontal'),
          default: false,
          group: 'display',
        },
        borderRadius: {
          type: 'radios',
          label: $t('chartsBorderRadius', 'Corner radius'),
          default: '0',
          options: {
            '0': $t('chartsBorderRadiusNone', 'None'),
            '4': $t('chartsBorderRadiusSmall', 'Small'),
            '8': $t('chartsBorderRadiusLarge', 'Large'),
          },
        },
        ...shared.options,
      },
    },
  }
})
