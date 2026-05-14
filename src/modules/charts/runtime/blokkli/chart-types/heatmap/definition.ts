import { defineChartType } from '../../../chart-types/define'
import {
  xAxisOptions,
  legendOptions,
  gridOptions,
  mergeShared,
} from '../../../chart-types/shared'
import type {
  XAxisTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
} from '../../../chart-types/shared'

export type TypeOptions = XAxisTypeOptions &
  LegendTypeOptions &
  GridTypeOptions

export default defineChartType<TypeOptions>('heatmap', ($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    legendOptions($t),
    gridOptions($t),
  )
  return {
    hasMultipleSeries: true,
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
