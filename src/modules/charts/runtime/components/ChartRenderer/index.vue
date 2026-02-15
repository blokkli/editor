<template>
  <div ref="rootEl">
    <component
      :is="ApexChart"
      v-if="ApexChart"
      :type="type"
      :options="chartOptions"
      :series="chartSeries"
      height="350"
    />
    <ol v-if="footnotes?.length" class="bk-chart-footnotes">
      <li v-for="(note, i) in footnotes" :key="i">
        <span class="bk-chart-footnote-marker">{{
          superscriptFor(i + 1)
        }}</span>
        {{ note }}
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, useTemplateRef } from '#imports'
import type { BlokkliChartData } from '../../types'
import { resolveChartColor, applyFootnotes, SUPERSCRIPTS, getCapabilities } from '../../types'
import { COLORS } from '#blokkli-build/charts-config'

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'))

const props = defineProps<BlokkliChartData>()

const rootEl = useTemplateRef('rootEl')

const caps = computed(() => getCapabilities(props.type))

function superscriptFor(n: number): string {
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPTS[d] || d)
    .join('')
}

const resolvedColors = computed(() => {
  if (caps.value.hasCategoryColors) {
    return props.categoryColors.map((id) =>
      resolveChartColor(id, COLORS, rootEl.value),
    )
  }
  if (caps.value.hasSeriesColors) {
    return props.series.map((s) =>
      resolveChartColor(s.color, COLORS, rootEl.value),
    )
  }
  return []
})

const chartOptions = computed(() => {
  const base: Record<string, any> = {
    chart: {
      toolbar: { show: false },
    },
  }

  if (resolvedColors.value.length) {
    base.colors = resolvedColors.value
  }

  if (props.title) {
    base.title = { text: applyFootnotes(props.title), align: 'left' }
  }

  if (!caps.value.hasMultipleSeries) {
    base.labels = props.categories.map(applyFootnotes)
  } else {
    base.xaxis = { categories: props.categories.map(applyFootnotes) }
  }

  if (props.type === 'heatmap') {
    base.dataLabels = { enabled: true }
    base.plotOptions = {
      heatmap: {
        colorScale: { ranges: [] },
      },
    }
  }

  return base
})

const chartSeries = computed(() => {
  if (!caps.value.hasMultipleSeries) {
    return props.series[0]?.data || []
  }
  if (props.type === 'heatmap') {
    return props.series.map((s) => ({
      name: applyFootnotes(s.name),
      data: s.data.map((value, i) => ({
        x: applyFootnotes(props.categories[i] || ''),
        y: value,
      })),
    }))
  }
  return props.series.map((s) => ({
    name: applyFootnotes(s.name),
    data: s.data,
  }))
})
</script>
