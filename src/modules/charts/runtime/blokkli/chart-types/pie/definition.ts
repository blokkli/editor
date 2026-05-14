import { defineChartType } from '#blokkli/charts/definition'

export type TypeOptions = { showLabels: boolean }

export default defineChartType<TypeOptions>('pie', ($t) => ({
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
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
