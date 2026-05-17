import { defineChartType } from '#blokkli/charts/definition'
import {
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type { CategoryFilterTypeOptions } from '#blokkli/charts/types'

export type TypeOptions = {
  showTotal: boolean
  showLabels: boolean
} & CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('donut', ($t) => {
  const shared = mergeShared(categoryFilterOptions($t))
  return {
    hasSeriesColors: false,
    hasCategoryColors: true,
    editor: {
      label: $t('chartsTypeDonut', 'Donut'),
      description: $t(
        'chartsTypeDonutDescription',
        'Displays parts of a whole as a ring, leaving room in the centre for a total or summary value.',
      ),
      icon: 'bk_mdi_donut_large',
      options: {
        showTotal: {
          type: 'checkbox',
          label: $t('chartsDonutShowTotal', 'Show total'),
          default: false,
          group: 'display',
        },
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
