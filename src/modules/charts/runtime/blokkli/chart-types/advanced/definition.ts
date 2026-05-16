import { defineChartType } from '#blokkli/charts/definition'

export type TypeOptions = Record<string, never>

const DEFAULT_OBJECT: Record<string, unknown> = {
  title: { text: 'Advanced chart' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: [120, 200, 150, 80, 70] }],
}

export const ADVANCED_DEFAULT_SOURCE = JSON.stringify(DEFAULT_OBJECT, null, 2)
export const ADVANCED_DEFAULT_PARSED = DEFAULT_OBJECT

export default defineChartType<TypeOptions>('advanced', ($t) => ({
  hasSeriesColors: false,
  hasCategoryColors: false,
  editor: {
    label: $t('chartsTypeAdvanced', 'Advanced'),
    description: $t(
      'chartsTypeAdvancedDescription',
      'Paste a raw ECharts configuration. Full control, no structured data table.',
    ),
    icon: 'bk_mdi_data_object',
    options: {},
  },
}))
