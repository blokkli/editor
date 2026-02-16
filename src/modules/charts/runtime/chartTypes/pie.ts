import { defineChartType } from './define'

export default defineChartType(($t) => ({
  id: 'pie',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  optionDefaults: { showLabels: true },
  buildChartOptions(ctx) {
    return {
      labels: ctx.categories,
      dataLabels: { enabled: !!ctx.typeOptions.showLabels },
    }
  },
  buildSeries(ctx) {
    return ctx.series[0]?.data || []
  },
  editor: {
    label: $t('chartsTypePie', 'Pie'),
    icon: 'bk_mdi_pie_chart',
    options: {
      showLabels: {
        type: 'toggle',
        label: $t('chartsPieShowLabels', 'Show labels'),
        group: 'labels',
      },
    },
  },
}))
