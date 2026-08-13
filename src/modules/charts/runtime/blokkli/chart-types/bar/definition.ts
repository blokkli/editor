import { defineChartType } from '#blokkli/charts/definition'
import {
  xAxisOptions,
  dataLabelsOptions,
  yAxisMinOptions,
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  XAxisTypeOptions,
  DataLabelsTypeOptions,
  YAxisMinTypeOptions,
  CategoryFilterTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = {
  stacked: boolean
  horizontal: boolean
} & XAxisTypeOptions &
  DataLabelsTypeOptions &
  YAxisMinTypeOptions &
  CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('bar', ($t) => {
  const shared = mergeShared(
    xAxisOptions($t),
    dataLabelsOptions($t),
    yAxisMinOptions($t),
    categoryFilterOptions($t),
  )
  return {
    hasSeriesColors: true,
    hasCategoryColors: false,
    hasAxes: true,
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
        ...shared.options,
      },
    },
  }
})
