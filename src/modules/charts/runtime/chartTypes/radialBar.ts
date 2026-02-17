import { defineChartType } from './define'

export default defineChartType(($t) => ({
  id: 'radialBar',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  buildChartOptions(ctx) {
    const showLabels = !!ctx.typeOptions.showLabels
    const showTotal = !!ctx.typeOptions.showTotal
    return {
      labels: ctx.categories,
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: { show: showLabels },
            value: { show: showLabels },
            total: { show: showTotal },
          },
        },
      },
    }
  },
  buildSeries(ctx) {
    return ctx.series[0]?.data || []
  },
  editor: {
    label: $t('chartsTypeRadialBar', 'Radial Bar'),
    icon: 'bk_mdi_track_changes',
    options: {
      showLabels: {
        type: 'checkbox',
        label: $t('chartsRadialBarShowLabels', 'Show labels'),
        default: true,
        group: 'labels',
      },
      showTotal: {
        type: 'checkbox',
        label: $t('chartsRadialBarShowTotal', 'Show total'),
        default: false,
        group: 'display',
      },
    },
  },
}))
