import { defineChartType } from './define'
import {
  createNumberFormatter,
  createPercentFormatter,
} from '../helpers/numberFormat'

export type TypeOptions = { showTotal: boolean; showLabels: boolean }

export default defineChartType<TypeOptions>(($t) => ({
  id: 'donut',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  buildChartOptions(ctx) {
    const show = !!ctx.typeOptions.showTotal
    const formatValue = createNumberFormatter(ctx.numberFormat)
    return {
      labels: ctx.categories,
      dataLabels: {
        enabled: !!ctx.typeOptions.showLabels,
        formatter: createPercentFormatter(ctx.numberFormat),
      },
      tooltip: { y: { formatter: formatValue } },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show,
              value: { formatter: formatValue },
              total: {
                show,
                formatter: (w: { globals: { seriesTotals: number[] } }) =>
                  formatValue(
                    (w.globals.seriesTotals || []).reduce(
                      (sum, n) => sum + n,
                      0,
                    ),
                  ),
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
    label: $t('chartsTypeDonut', 'Donut'),
    description: $t(
      'chartsTypeDonutDescription',
      'Displays parts of a whole as a ring, leaving room in the centre for a total or summary value.',
    ),
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
