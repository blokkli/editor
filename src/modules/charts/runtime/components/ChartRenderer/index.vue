<template>
  <div>
    <ClientOnly>
      <component
        :is="ApexChart"
        v-if="ApexChart"
        :type="type"
        :options="chartOptions"
        :series="chartSeries"
        height="350"
      />
      <ol v-if="footnotes?.length" class="blokkli-chart-footnotes">
        <li v-for="(note, i) in footnotes" :key="i">
          <span class="blokkli-chart-footnote-marker">{{
            superscriptFor(i + 1)
          }}</span>
          {{ note }}
        </li>
      </ol>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, useAppConfig } from '#imports'
import type { BlokkliChartData } from '../../types'
import { applyFootnotes, SUPERSCRIPTS } from '../../helpers'
import { getChartTypeRuntime, getDefaultTypeOptions } from '../../chartTypes'
import type { ChartBuildContext } from '../../chartTypes'
import type { ApexOptions } from 'apexcharts'

const ApexChart = import.meta.client
  ? defineAsyncComponent(() => import('vue3-apexcharts'))
  : undefined

const props = defineProps<BlokkliChartData>()

const appConfig = useAppConfig()

const chartDef = computed(() =>
  import.meta.client ? getChartTypeRuntime(props.type) : undefined,
)

function superscriptFor(n: number): string {
  if (import.meta.server) {
    return ''
  }
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPTS[d] || d)
    .join('')
}

function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key]) &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

function resolveHex(id: string): string {
  const map = appConfig.blokkli?.colorOptions as
    | Record<string, string>
    | undefined
  return map?.[id] || '#888888'
}

const resolvedColors = computed(() => {
  if (import.meta.server) {
    return []
  }
  const def = chartDef.value
  if (!def) return []
  if (def.hasCategoryColors) {
    return props.categoryColors.map(resolveHex)
  }
  if (def.hasSeriesColors) {
    return props.series.map((s) => resolveHex(s.color))
  }
  return []
})

const chartOptions = computed<ApexOptions>(() => {
  if (import.meta.server) {
    return {}
  }
  const def = chartDef.value
  if (!def) return {}

  const base: ApexOptions = {
    chart: {
      toolbar: { show: false },
      redrawOnParentResize: false,
      zoom: { enabled: false },
    },
  }

  if (resolvedColors.value.length) {
    base.colors = resolvedColors.value
  }

  if (props.title) {
    base.title = { text: applyFootnotes(props.title), align: 'left' }
  }

  const ctx: ChartBuildContext = {
    title: props.title,
    categories: props.categories.map(applyFootnotes),
    series: props.series.map((s) => ({
      name: applyFootnotes(s.name),
      color: s.color,
      data: s.data,
    })),
    seriesColors: resolvedColors.value,
    categoryColors: resolvedColors.value,
    typeOptions: {
      ...getDefaultTypeOptions(props.type),
      ...props.typeOptions,
    },
    numberFormat: props.numberFormat,
  }

  const typeOpts = def.buildChartOptions(ctx)
  return deepMerge(base, typeOpts)
})

const chartSeries = computed(() => {
  if (import.meta.server) {
    return []
  }
  const def = chartDef.value
  if (!def) return []

  const ctx: ChartBuildContext = {
    title: props.title,
    categories: props.categories.map(applyFootnotes),
    series: props.series.map((s) => ({
      name: applyFootnotes(s.name),
      color: s.color,
      data: s.data,
    })),
    seriesColors: resolvedColors.value,
    categoryColors: resolvedColors.value,
    typeOptions: {
      ...getDefaultTypeOptions(props.type),
      ...props.typeOptions,
    },
    numberFormat: props.numberFormat,
  }

  return def.buildSeries(ctx)
})
</script>
