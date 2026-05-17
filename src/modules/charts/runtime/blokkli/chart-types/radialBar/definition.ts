import { defineChartType } from '#blokkli/charts/definition'
import {
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type { CategoryFilterTypeOptions } from '#blokkli/charts/types'

export type TypeOptions = {
  showLabels: boolean
} & CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('radialBar', ($t) => {
  const shared = mergeShared(categoryFilterOptions($t))
  return {
    hasSeriesColors: false,
    hasCategoryColors: true,
    editor: {
      label: $t('chartsTypeRadialBar', 'Radial Bar'),
      description: $t(
        'chartsTypeRadialBarDescription',
        'Shows values as concentric circular bars on a polar grid — suited to KPIs and progress indicators.',
      ),
      icon: 'bk_mdi_track_changes',
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
