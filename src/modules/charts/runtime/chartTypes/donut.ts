import { defineChartType } from './define'

export type TypeOptions = { showTotal: boolean; showLabels: boolean }

export default defineChartType<TypeOptions>(($t) => ({
  id: 'donut',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
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
        type: 'checkbox',
        label: $t('chartsDonutShowTotal', 'Show total'),
        default: false,
        group: 'display',
      },
      showLabels: {
        type: 'checkbox',
        label: $t('chartsDonutShowLabels', 'Show labels'),
        default: true,
        group: 'labels',
      },
    },
  },
}))
