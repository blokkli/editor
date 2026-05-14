import { defineChartType } from '#blokkli/charts/definition'

export type TypeOptions = { showLabels: boolean }

export default defineChartType<TypeOptions>('radialBar', ($t) => ({
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  editor: {
    label: $t('chartsTypeRadialBar', 'Radial Bar'),
    description: $t(
      'chartsTypeRadialBarDescription',
      'Shows values as concentric circular bars on a polar grid — suited to KPIs and progress indicators.',
    ),
    icon: 'bk_mdi_track_changes',
    options: {
      showLabels: {
        type: 'checkbox',
        label: $t('chartsRadialBarShowLabels', 'Show labels'),
        default: true,
        group: 'labels',
      },
    },
  },
}))
