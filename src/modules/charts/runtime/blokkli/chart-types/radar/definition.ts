import { defineChartType } from '../../../chart-types/define'
import {
  dataLabelsOptions,
  legendOptions,
  mergeShared,
} from '../../../chart-types/shared'
import type {
  DataLabelsTypeOptions,
  LegendTypeOptions,
} from '../../../chart-types/shared'

export type TypeOptions = {
  markers: boolean
  fillOpacity: string
} & DataLabelsTypeOptions &
  LegendTypeOptions

export default defineChartType<TypeOptions>('radar', ($t) => {
  const shared = mergeShared(dataLabelsOptions($t), legendOptions($t))
  return {
    hasMultipleSeries: true,
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
