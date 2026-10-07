<template>
  <div :class="[spacing, widthClass, { hidden: !hasChart && !isEditing }]">
    <Chart v-if="hasChart" :data="chartData!" :dynamic-data />
    <p v-else class="bg-surface p-4 text-muted">
      {{ $texts('chart.empty', 'No data yet: edit the chart to add some.') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineBlokkli, useLazyAsyncData } from '#imports'
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'
import Chart from '~/components/Chart/index.vue'
import { useLanguage } from '~/composables/useLanguage'
import { WIDTH_CLASSES } from '~/helpers/width'
import { useBlockSpacing } from '~/composables/useBlockSpacing'
import { useBlockWidth } from '~/composables/useBlockWidth'

// A chart of the charts module. The paragraph has no fields: the chart,
// including its title and translations, is a block option.
const block = defineBlokkli({
  bundle: 'chart',
  chunkName: 'chart',
  globalOptions: ['width', 'bkVisibleLanguages'],
  options: {
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
    // Not in nested blocks and on detail pages, where it has no effect
    // (useBlockWidth).
    determineVisibleOptions: (ctx) =>
      ctx.parentType || ctx.entity.entityBundle === 'page' ? [] : ['width'],
  },
})
const { options } = block
const spacing = useBlockSpacing(block)

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

// Full width makes no sense for a chart: it's as wide as "wide".
const width = useBlockWidth(block)
const widthClass = computed(() =>
  width.value
    ? WIDTH_CLASSES[width.value === 'content' ? 'content' : 'wide']
    : '',
)

const isEditing = import.meta.blokkliEditing
</script>
