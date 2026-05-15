import { defineChartType } from '#blokkli/charts/definition'
import {
  dataLabelsOptions,
  legendOptions,
  categoryFilterOptions,
  mergeShared,
} from '#blokkli/charts/definition/options'
import type {
  DataLabelsTypeOptions,
  LegendTypeOptions,
  CategoryFilterTypeOptions,
} from '#blokkli/charts/types'

export type TypeOptions = {
  markers: boolean
  fillOpacity: string
} & DataLabelsTypeOptions &
  LegendTypeOptions &
  CategoryFilterTypeOptions

export default defineChartType<TypeOptions>('radar', ($t) => {
  const shared = mergeShared(
    dataLabelsOptions($t),
    legendOptions($t),
    categoryFilterOptions($t),
  )
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
          label: $t('chartsRadarMarkers', 'Show markers'),
          default: false,
          group: 'display',
        },
        fillOpacity: {
          type: 'radios',
          label: $t('chartsRadarFillOpacity', 'Fill opacity'),
          default: '0.2',
          options: {
            '0.2': $t('chartsOpacityTransparent', 'Transparent'),
            '0.4': $t('chartsOpacityLight', 'Light'),
            '0.8': $t('chartsOpacitySolid', 'Solid'),
          },
        },
        ...shared.options,
      },
    },
  }
})
