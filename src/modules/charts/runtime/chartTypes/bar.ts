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
    optionDefaults: {
      stacked: false,
      horizontal: false,
      borderRadius: '0',
      ...shared.defaults,
    },
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
          type: 'toggle',
          label: $t('chartsBarStacked', 'Stacked'),
          group: 'display',
        },
        horizontal: {
          type: 'toggle',
          label: $t('chartsBarHorizontal', 'Horizontal'),
          group: 'display',
        },
        borderRadius: {
          type: 'select',
          label: $t('chartsBorderRadius', 'Corner radius'),
          options: [
            { value: '0', label: $t('chartsBorderRadiusNone', 'None') },
            { value: '4', label: $t('chartsBorderRadiusSmall', 'Small') },
            { value: '8', label: $t('chartsBorderRadiusLarge', 'Large') },
          ],
        },
        ...shared.options,
      },
    },
  }
})
