import { defineChartType } from './define'
import { createPercentFormatter } from '../helpers/numberFormat'

export type TypeOptions = { showLabels: boolean; showTotal: boolean }

export default defineChartType<TypeOptions>(($t) => ({
  id: 'radialBar',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  buildChartOptions(ctx) {
    const showLabels = !!ctx.typeOptions.showLabels
    const showTotal = !!ctx.typeOptions.showTotal
    const formatPercent = createPercentFormatter(ctx.numberFormat)
    return {
      labels: ctx.categories,
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: { show: showLabels },
            value: { show: showLabels, formatter: formatPercent },
            total: {
              show: showTotal,
              formatter: (w: { globals: { seriesTotals: number[] } }) => {
                const totals = w.globals.seriesTotals || []
                if (!totals.length) return formatPercent(0)
                const avg = totals.reduce((s, n) => s + n, 0) / totals.length
                return formatPercent(avg)
              },
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
    label: $t('chartsTypeRadialBar', 'Radial Bar'),
    description: $t(
      'chartsTypeRadialBarDescription',
      'Shows progress or percentages as concentric circular bars, suited to KPIs and goal tracking.',
    ),
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
