import { defineChartType } from '../define'
import {
  createNumberFormatter,
  createPercentFormatter,
} from '../../helpers/numberFormat'

export type TypeOptions = { showLabels: boolean }

export default defineChartType<TypeOptions>(($t) => ({
  id: 'pie',
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  buildChartOptions(ctx) {
    return {
      labels: ctx.categories,
      dataLabels: {
        enabled: !!ctx.typeOptions.showLabels,
        formatter: createPercentFormatter(ctx.numberFormat),
      },
      tooltip: { y: { formatter: createNumberFormatter(ctx.numberFormat) } },
    }
  },
  buildSeries(ctx) {
    return ctx.series[0]?.data || []
  },
  editor: {
    label: $t('chartsTypePie', 'Pie'),
    description: $t(
      'chartsTypePieDescription',
      'Divides a circle into slices to show proportional shares of a whole.',
    ),
    icon: 'bk_mdi_pie_chart',
    options: {
      showLabels: {
        type: 'checkbox',
        label: $t('chartsPieShowLabels', 'Show labels'),
        default: true,
        group: 'labels',
      },
    },
  },
}))
