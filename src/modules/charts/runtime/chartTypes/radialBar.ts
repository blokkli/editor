import { defineChartType } from './define'

export default defineChartType(($t) => ({
  id: 'radialBar',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  optionDefaults: { showLabels: true, showTotal: false },
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
        type: 'toggle',
        label: $t('chartsRadialBarShowLabels', 'Show labels'),
        group: 'labels',
      },
      showTotal: {
        type: 'toggle',
        label: $t('chartsRadialBarShowTotal', 'Show total'),
        group: 'display',
      },
    },
  },
}))
