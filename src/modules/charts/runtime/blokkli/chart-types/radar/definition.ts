import { defineChartType } from '#blokkli/charts/definition'
import {
  dataLabelsOptions,
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  DataLabelsTypeOptions,
  CategoryFilterTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = {
  markers: boolean
} & DataLabelsTypeOptions &
  CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('radar', ($t) => {
  const shared = mergeShared(dataLabelsOptions($t), categoryFilterOptions($t))
  return {
    hasSeriesColors: true,
    hasCategoryColors: false,
    editor: {
      label: $t('chartsTypeRadar', 'Radar'),
      description: $t(
        'chartsTypeRadarDescription',
        'Plots several variables on radial axes to compare strengths and weaknesses across categories.',
      ),
      icon: 'bk_mdi_radar',
      options: {
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
