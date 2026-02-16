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
    optionDefaults: {
      markers: false,
      fillOpacity: '0.2',
      ...shared.defaults,
    },
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
          type: 'toggle',
          label: $t('chartsRadarMarkers', 'Show markers'),
          group: 'display',
        },
        fillOpacity: {
          type: 'select',
          label: $t('chartsRadarFillOpacity', 'Fill opacity'),
          options: [
            {
              value: '0.2',
              label: $t('chartsOpacityTransparent', 'Transparent'),
            },
            { value: '0.4', label: $t('chartsOpacityLight', 'Light') },
            { value: '0.8', label: $t('chartsOpacitySolid', 'Solid') },
          ],
        },
        ...shared.options,
      },
    },
  }
})
