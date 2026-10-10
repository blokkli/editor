<template>
  <div
    :class="[
      spacing,
      width && WIDTH_CLASSES[width],
      { hidden: !hasChart && !isEditing },
    ]"
  >
    <Chart
      v-if="hasChart"
      :data="chartData!"
      :dynamic-data
      :height="options.height"
    />
    <p v-else class="bg-surface p-4 text-muted">
      {{ $texts('chart.empty', 'No data yet: edit the chart to add some.') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'

// A chart of the charts module. The paragraph has no fields: the chart,
// including its title and translations, is a block option.
const block = defineBlokkli({
  bundle: 'chart',
  chunkName: 'chart',
  globalOptions: ['bkVisibleLanguages'],
  options: {
    // The global width option without "Full", which is no wider than "Wide"
    // here.
    width: {
      type: 'radios',
      label: { en: 'Width', de: 'Breite', fr: 'Largeur' },
      default: 'content',
      displayAs: 'icons',
      group: 'size',
      options: {
        content: {
          label: { en: 'Content', de: 'Inhalt', fr: 'Contenu' },
          icon: 'bk_mdi_width_normal',
        },
        wide: {
          label: { en: 'Wide', de: 'Breit', fr: 'Large' },
          icon: 'bk_mdi_width_wide',
        },
      },
    },
    height: {
      type: 'range',
      label: { en: 'Height', de: 'Höhe', fr: 'Hauteur' },
      description: {
        en: 'In percent of the usual height.',
        de: 'In Prozent der üblichen Höhe.',
        fr: 'En pour cent de la hauteur habituelle.',
      },
      default: 100,
      min: 50,
      max: 150,
      step: 10,
      group: 'size',
    },
    data: {
      type: 'json',
      label: { en: 'Chart', de: 'Diagramm', fr: 'Graphique' },
      default: '{}',
      dataType: 'chart',
    },
  },
  editor: {
    icon: 'bk_mdi_bar_chart',
    previewWidth: 800,
    // Adding one opens the chart editor; there's nothing to edit inline.
    addBehaviour: 'complex-option:data',
    disableEdit: true,
    // The width not in nested blocks and on detail pages, where it has no
    // effect (useBlockWidth).
    determineVisibleOptions: (ctx) =>
      ctx.parentType || ctx.entity.entityBundle === 'page'
        ? ['height']
        : ['width', 'height'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)
const width = useBlockWidth(block)

const chartData = computed<BlokkliChartData | null>(() => options.value.data)

// The data of a bound source (server/api/chart-data), in the page's language.
// Only in the browser: the chart renders there anyway.
const language = useLanguage()
const sourceId = computed(() => chartData.value?.dataSource?.id)
const { data: dynamicData } = useLazyAsyncData(
  () => `chart-data:${sourceId.value}:${language.value}`,
  () =>
    sourceId.value
      ? $fetch<ChartDataSourcePayload>(`/api/chart-data/${sourceId.value}`, {
          query: { language: language.value },
        })
      : Promise.resolve(null),
  { server: false },
)

const hasChart = computed(() => {
  const data = chartData.value
  if (!data?.type) {
    return false
  }
  if (data.type === 'advanced') {
    return !!data.advancedConfig?.parsed
  }
  return !!data.dataSource || (data.series?.length ?? 0) > 0
})

const isEditing = import.meta.blokkliEditing
</script>
