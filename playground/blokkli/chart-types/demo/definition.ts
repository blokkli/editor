import { defineChartType } from '#blokkli/charts/definition'

export type TypeOptions = {
  showValues: boolean
}

export default defineChartType<TypeOptions>('demo', ($t) => ({
  hasMultipleSeries: false,
  hasSeriesColors: false,
  hasCategoryColors: true,
  editor: {
    label: $t('chartsTypeDemo', 'Demo'),
    description: $t(
      'chartsTypeDemoDescription',
      'Userland smoke-test chart type. Renders raw props as JSON.',
    ),
    icon: 'bk_mdi_bug_report',
    options: {
      showValues: {
        type: 'checkbox',
        label: $t('chartsDemoShowValues', 'Show values'),
        default: true,
        group: 'display',
      },
    },
  },
}))
