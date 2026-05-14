import { defineChartType } from '../../../chart-types/define'
import {
  xAxisOptions,
  dataLabelsOptions,
  legendOptions,
  gridOptions,
  strokeWidthOptions,
  yAxisMinOptions,
  mergeShared,
} from '../../../chart-types/shared'
import type {
  XAxisTypeOptions,
  DataLabelsTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
  StrokeWidthTypeOptions,
  YAxisMinTypeOptions,
} from '../../../chart-types/shared'

export type TypeOptions = {
  curved: boolean
  markers: boolean
} & XAxisTypeOptions &
  DataLabelsTypeOptions &
  LegendTypeOptions &
  GridTypeOptions &
  StrokeWidthTypeOptions &
  YAxisMinTypeOptions

export default defineChartType<TypeOptions>('line', ($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
    strokeWidthOptions($t),
    yAxisMinOptions($t),
  )
  return {
    hasMultipleSeries: true,
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
          label: $t('chartsLineCurved', 'Smooth curves'),
          default: false,
          group: 'display',
        },
        markers: {
          type: 'checkbox',
          label: $t('chartsLineMarkers', 'Show markers'),
          default: false,
          group: 'display',
        },
        ...shared.options,
      },
    },
  }
})
