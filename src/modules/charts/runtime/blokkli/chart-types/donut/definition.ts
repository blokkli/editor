import { defineChartType } from '../../../chart-types/define'

export type TypeOptions = { showTotal: boolean; showLabels: boolean }

export default defineChartType<TypeOptions>('donut', ($t) => ({
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
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
