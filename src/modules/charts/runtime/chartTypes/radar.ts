import { defineChartType } from './define'
import {
  dataLabelsOptions,
  buildDataLabelsOptions,
  legendOptions,
  buildLegendOptions,
  mergeShared,
} from './shared'

export default defineChartType(($t) => {
  const shared = mergeShared(dataLabelsOptions($t), legendOptions($t))
  return {
    id: 'radar',
    hasMultipleSeries: true,
    hasSeriesColors: true,
    hasCategoryColors: false,
    buildChartOptions(ctx) {
      return {
        xaxis: { categories: ctx.categories },
        markers: { size: ctx.typeOptions.markers ? 5 : 0 },
        fill: { opacity: Number(ctx.typeOptions.fillOpacity) || 0.2 },
        ...buildDataLabelsOptions(ctx.typeOptions),
        ...buildLegendOptions(ctx.typeOptions),
      }
    },
    buildSeries(ctx) {
      return ctx.series.map((s) => ({ name: s.name, data: s.data }))
    },
    editor: {
      label: $t('chartsTypeRadar', 'Radar'),
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
