import { defineChartType } from '#blokkli/charts/definition'
import {
  xAxisOptions,
  dataLabelsOptions,
  legendOptions,
  gridOptions,
  strokeWidthOptions,
  yAxisMinOptions,
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  XAxisTypeOptions,
  DataLabelsTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
  StrokeWidthTypeOptions,
  YAxisMinTypeOptions,
  CategoryFilterTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = {
  curved: boolean
  markers: boolean
} & XAxisTypeOptions &
  DataLabelsTypeOptions &
  LegendTypeOptions &
  GridTypeOptions &
  StrokeWidthTypeOptions &
  YAxisMinTypeOptions &
  CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('line', ($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
    strokeWidthOptions($t),
    yAxisMinOptions($t),
    categoryFilterOptions($t),
  )
  return {
    hasSeriesColors: true,
    hasCategoryColors: false,
    editor: {
      label: $t('chartsTypeLine', 'Line'),
      description: $t(
        'chartsTypeLineDescription',
        'Connects data points with lines to show trends and changes across a continuous range.',
      ),
      icon: 'bk_mdi_show_chart',
      options: {
        curved: {
          type: 'checkbox',
          label: $t('smoothCurves', 'Smooth curves'),
          default: false,
          group: 'display',
        },
        markers: {
          type: 'checkbox',
          label: $t('showMarkers', 'Show markers'),
          default: false,
          group: 'display',
        },
        ...shared.options,
      },
    },
  }
})
