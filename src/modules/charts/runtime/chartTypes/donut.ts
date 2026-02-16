import { defineChartType } from './define'

export default defineChartType(($t) => ({
  id: 'donut',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  optionDefaults: { showTotal: false, showLabels: true },
  buildChartOptions(ctx) {
    const show = !!ctx.typeOptions.showTotal
    return {
      labels: ctx.categories,
      dataLabels: { enabled: !!ctx.typeOptions.showLabels },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show,
              total: { show },
            },
          },
        },
      },
    }
  },
  buildSeries(ctx) {
    return ctx.series[0]?.data || []
  },
  editor: {
    label: $t('chartsTypeDonut', 'Donut'),
    icon: 'bk_mdi_donut_large',
    options: {
      showTotal: {
        type: 'toggle',
        label: $t('chartsDonutShowTotal', 'Show total'),
        group: 'display',
      },
      showLabels: {
        type: 'toggle',
        label: $t('chartsDonutShowLabels', 'Show labels'),
        group: 'labels',
      },
    },
  },
}))
