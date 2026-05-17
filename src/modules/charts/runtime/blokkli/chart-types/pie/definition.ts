import { defineChartType } from '#blokkli/charts/definition'
import {
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type { CategoryFilterTypeOptions } from '#blokkli/charts/types'

export type TypeOptions = {
  showLabels: boolean
} & CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('pie', ($t) => {
  const shared = mergeShared(categoryFilterOptions($t))
  return {
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
          label: $t('showLabels', 'Show labels'),
          default: true,
          group: 'labels',
        },
        ...shared.options,
      },
    },
  }
})
