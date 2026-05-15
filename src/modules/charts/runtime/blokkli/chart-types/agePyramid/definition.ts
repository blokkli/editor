import { defineChartType } from '#blokkli/charts/definition'
import {
  dataLabelsOptions,
  gridOptions,
  legendOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  DataLabelsTypeOptions,
  GridTypeOptions,
  LegendTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = {
  splitIndex?: number
} & DataLabelsTypeOptions &
  GridTypeOptions &
  LegendTypeOptions

export default defineChartType<TypeOptions>('agePyramid', ($t) => {
  const shared = mergeShared(
    dataLabelsOptions($t),
    gridOptions($t),
    legendOptions($t),
  )
  return {
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
    editor: {
      label: $t('chartsTypeAgePyramid', 'Age pyramid'),
      description: $t(
        'chartsTypeAgePyramidDescription',
        'Back-to-back horizontal bars by category, with series before the split index rendered on the left and the rest on the right. Multiple series on the same side stack.',
      ),
      icon: 'bk_mdi_groups_2',
      options: {
        splitIndex: {
          type: 'number',
          nullable: true,
          label: $t('chartsAgePyramidSplitIndex', 'Right-side start index'),
          description: $t(
            'chartsAgePyramidSplitIndexDescription',
            'Index of the first series rendered on the right. Series before this index render on the left. Defaults to half the number of series.',
          ),
          min: 0,
          group: 'display',
        },
        ...shared.options,
      },
    },
  }
})
