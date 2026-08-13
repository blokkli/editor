import { defineChartType } from '#blokkli/charts/definition'
import {
  xAxisOptions,
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  XAxisTypeOptions,
  CategoryFilterTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = XAxisTypeOptions & CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('heatmap', ($t) => {
  const shared = mergeShared(xAxisOptions($t), categoryFilterOptions($t))
  return {
    hasSeriesColors: false,
    hasCategoryColors: false,
    editor: {
      label: $t('chartsTypeHeatmap', 'Heatmap'),
      description: $t(
        'chartsTypeHeatmapDescription',
        'Visualises values across two dimensions using colour intensity to reveal patterns and outliers.',
      ),
      icon: 'bk_mdi_grid_view',
      options: { ...shared.options },
    },
  }
})
