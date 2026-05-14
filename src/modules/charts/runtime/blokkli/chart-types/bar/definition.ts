import { defineChartType } from '../../../chart-types/define'
import {
  xAxisOptions,
  dataLabelsOptions,
  legendOptions,
  gridOptions,
  yAxisMinOptions,
  mergeShared,
} from '../../../chart-types/shared'
import type {
  XAxisTypeOptions,
  DataLabelsTypeOptions,
  LegendTypeOptions,
  GridTypeOptions,
  YAxisMinTypeOptions,
} from '../../../chart-types/shared'

export type TypeOptions = {
  stacked: boolean
  horizontal: boolean
  borderRadius: string
} & XAxisTypeOptions &
  DataLabelsTypeOptions &
  LegendTypeOptions &
  GridTypeOptions &
  YAxisMinTypeOptions

export default defineChartType<TypeOptions>('bar', ($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    legendOptions($t),
    gridOptions($t),
    yAxisMinOptions($t),
  )
  return {
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
    editor: {
      label: $t('chartsTypeBar', 'Bar'),
      description: $t(
        'chartsTypeBarDescription',
        'Compares values across categories using rectangular bars, best for ranking and side-by-side comparisons.',
      ),
      icon: 'bk_mdi_bar_chart',
      options: {
        stacked: {
          type: 'checkbox',
          label: $t('chartsBarStacked', 'Stacked'),
          default: false,
          group: 'display',
        },
        horizontal: {
          type: 'checkbox',
          label: $t('chartsBarHorizontal', 'Horizontal'),
          default: false,
          group: 'display',
        },
        borderRadius: {
          type: 'radios',
          label: $t('chartsBorderRadius', 'Corner radius'),
          default: '0',
          options: {
            '0': $t('chartsBorderRadiusNone', 'None'),
            '4': $t('chartsBorderRadiusSmall', 'Small'),
            '8': $t('chartsBorderRadiusLarge', 'Large'),
          },
        },
        ...shared.options,
      },
    },
  }
})
