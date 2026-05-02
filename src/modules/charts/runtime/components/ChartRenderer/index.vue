<template>
  <div>
    <ClientOnly>
      <component
        :is="ApexChart"
        v-if="ApexChart"
        :type="type"
        :options="chartOptions"
        :series="chartSeries"
        height="550"
      />
      <ol v-if="resolvedFootnotes.length" class="blokkli-chart-footnotes">
        <li v-for="(note, i) in resolvedFootnotes" :key="i">
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
import { computed, defineAsyncComponent, inject, useAppConfig } from '#imports'
import type { BlokkliChartData } from '../../types'
import { applyFootnotes, SUPERSCRIPTS } from '../../helpers'
import { getChartTypeRuntime, getDefaultTypeOptions } from '../../chartTypes'
import type { ChartBuildContext } from '../../chartTypes'
import type { ApexOptions } from 'apexcharts'
import {
  INJECT_IS_EDITING,
  INJECT_PROVIDER_CONTEXT,
} from '#blokkli/helpers/injections'

const ApexChart = import.meta.client
  ? defineAsyncComponent(() => import('vue3-apexcharts'))
  : undefined

const props = defineProps<
  BlokkliChartData & {
    /**
     * Override the language used to resolve translated strings. When unset,
     * the language comes from the surrounding BlokkliProvider context.
     */
    languageOverride?: string
  }
>()

const isEditing = inject(INJECT_IS_EDITING, false)

const appConfig = useAppConfig()

const providerEntity = inject(INJECT_PROVIDER_CONTEXT, null)

const currentLanguage = computed(
  () => props.languageOverride ?? providerEntity?.value.language ?? '',
)

const resolvedTitle = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  return t?.title || props.title
})

const resolvedCategories = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  if (!t?.categories) return props.categories
  return props.categories.map((c, i) => t.categories?.[i] || c)
})

const resolvedSeries = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  if (!t?.seriesNames) return props.series
  return props.series.map((s, i) => ({
    ...s,
    name: t.seriesNames?.[i] || s.name,
  }))
})

const resolvedFootnotes = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  if (!t?.footnotes) return props.footnotes
  return props.footnotes.map((f, i) => t.footnotes?.[i] || f)
})

const resolvedNumberFormat = computed(() => {
  if (!props.numberFormat) return undefined
  const t = props.translations?.[currentLanguage.value]
  if (!t || (t.prefix === undefined && t.suffix === undefined)) {
    return props.numberFormat
  }
  return {
    ...props.numberFormat,
    prefix: t.prefix || props.numberFormat.prefix,
    suffix: t.suffix || props.numberFormat.suffix,
  }
})

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
      animations: { enabled: !isEditing },
    },
  }

  if (resolvedColors.value.length) {
    base.colors = resolvedColors.value
  }

  if (resolvedTitle.value) {
    base.title = { text: applyFootnotes(resolvedTitle.value), align: 'left' }
  }

  const ctx: ChartBuildContext = {
    title: resolvedTitle.value,
    categories: resolvedCategories.value.map(applyFootnotes),
    series: resolvedSeries.value.map((s) => ({
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
    numberFormat: resolvedNumberFormat.value,
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
    title: resolvedTitle.value,
    categories: resolvedCategories.value.map(applyFootnotes),
    series: resolvedSeries.value.map((s) => ({
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
    numberFormat: resolvedNumberFormat.value,
  }

  return def.buildSeries(ctx)
})
</script>
