<template>
  <div>
    <div v-if="showCategoryFilter" class="blokkli-chart-category-filter">
      <label>
        <span v-if="categoryFilterLabel">{{ categoryFilterLabel }}:</span>
        <select v-model.number="selectedCategoryIndex">
          <option v-for="(c, i) in formattedCategories" :key="i" :value="i">
            {{ c }}
          </option>
        </select>
      </label>
    </div>
    <ClientOnly>
      <component
        :is="typeComponent"
        v-if="typeComponent && finalRenderProps"
        v-bind="finalRenderProps"
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
import { computed, inject, ref, useAppConfig } from '#imports'
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
  ChartSeries,
  ChartTypeRenderProps,
} from '../../types'
import { applyFootnotes, SUPERSCRIPTS } from '../../helpers'
import { detectDateFormat, formatDateCategory } from '../../helpers/dateFormat'
import { INJECT_CHART_PREVIEW_DYNAMIC_DATA } from '../../helpers/previewInjection'
import { chartTypeComponents } from '#blokkli-build/charts-components'
import {
  INJECT_IS_EDITING,
  INJECT_PROVIDER_CONTEXT,
} from '#blokkli/helpers/injections'

const props = defineProps<
  BlokkliChartData & {
    /**
     * Override the language used to resolve translated strings. When unset,
     * the language comes from the surrounding BlokkliProvider context.
     */
    languageOverride?: string

    /**
     * Data fetched at runtime for a dynamic data source. Required when
     * `props.dataSource` is set; otherwise ignored.
     *
     * The integrator's chart block component is responsible for fetching
     * (e.g. via `useFetch` / `useLazyFetch`) and passing the result here.
     * For large payloads, prefer `useLazyFetch` or `useAsyncData` with
     * `server: false` to avoid bloating SSR HTML.
     */
    dynamicData?: ChartDataSourcePayload | null
  }
>()

const isEditing = inject(INJECT_IS_EDITING, false)

const appConfig = useAppConfig()

const providerEntity = inject(INJECT_PROVIDER_CONTEXT, null)

// Editor preview falls back to this inject when the integrator's block
// component does not pass a `dynamicData` prop. At runtime (outside the
// editor) this is never provided.
const previewDynamicData = inject(INJECT_CHART_PREVIEW_DYNAMIC_DATA, null)

const currentLanguage = computed(
  () => props.languageOverride ?? providerEntity?.value.language ?? '',
)

const colorPalette = computed(() => {
  const map = appConfig.blokkli?.colorOptions as
    | Record<string, string>
    | undefined
  if (!map) return [] as { id: string; hex: string }[]
  return Object.keys(map).map((id) => ({ id, hex: map[id]! }))
})

const hasDynamicSource = computed(() => !!props.dataSource)

const effectiveDynamicPayload = computed(() => {
  if (props.dynamicData !== undefined && props.dynamicData !== null) {
    return props.dynamicData
  }
  return previewDynamicData?.value ?? null
})

const effectiveData = computed<{
  categories: string[]
  series: ChartSeries[]
  categoryColors: string[]
} | null>(() => {
  if (hasDynamicSource.value) {
    const payload = effectiveDynamicPayload.value
    if (!payload) return null
    const overrides = props.dataSource?.seriesOverrides ?? {}
    const categoryOverrides = props.dataSource?.categoryColorOverrides ?? {}
    const palette = colorPalette.value
    const fallback = palette[0]?.id ?? ''
    const visibleSeries = payload.series.filter(
      (s) => overrides[s.name]?.hidden !== true,
    )
    const series: ChartSeries[] = visibleSeries.map((s, i) => ({
      name: s.name,
      color:
        overrides[s.name]?.color ??
        palette[i % Math.max(palette.length, 1)]?.id ??
        fallback,
      data: s.data,
    }))
    const categoryColors = payload.categories.map((label, i) => {
      return (
        categoryOverrides[label] ??
        palette[i % Math.max(palette.length, 1)]?.id ??
        fallback
      )
    })
    return {
      categories: payload.categories,
      series,
      categoryColors,
    }
  }
  return {
    categories: props.categories,
    series: props.series,
    categoryColors: props.categoryColors,
  }
})

const resolvedTitle = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  return t?.title || props.title
})

const resolvedCategories = computed(() => {
  const data = effectiveData.value
  if (!data) return [] as string[]
  // Translations for categories are positional and only safe for inline data.
  if (hasDynamicSource.value) return data.categories
  const t = props.translations?.[currentLanguage.value]
  if (!t?.categories) return data.categories
  return data.categories.map((c, i) => t.categories?.[i] || c)
})

const resolvedSeries = computed(() => {
  const data = effectiveData.value
  if (!data) return [] as ChartSeries[]
  // Translations for series names are positional and only safe for inline data.
  if (hasDynamicSource.value) return data.series
  const t = props.translations?.[currentLanguage.value]
  if (!t?.seriesNames) return data.series
  return data.series.map((s, i) => ({
    ...s,
    name: t.seriesNames?.[i] || s.name,
  }))
})

const resolvedFootnotes = computed(() => {
  const t = props.translations?.[currentLanguage.value]
  if (!t?.footnotes) return props.footnotes
  return props.footnotes.map((f, i) => t.footnotes?.[i] || f)
})

const formattedCategories = computed(() => {
  const cats = resolvedCategories.value
  const detected = detectDateFormat(cats)
  if (!detected) return cats
  const locale = props.numberFormat?.locale
  return cats.map((c) =>
    formatDateCategory(c, detected, props.dateFormat, locale),
  )
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

function superscriptFor(n: number): string {
  if (import.meta.server) {
    return ''
  }
  return String(n)
    .split('')
    .map((d) => SUPERSCRIPTS[d] || d)
    .join('')
}

function resolveHex(id: string): string {
  const map = appConfig.blokkli?.colorOptions as
    | Record<string, string>
    | undefined
  return map?.[id] || '#888888'
}

const typeComponent = computed(
  () => chartTypeComponents[props.type as keyof typeof chartTypeComponents],
)

const renderProps = computed<ChartTypeRenderProps | null>(() => {
  const data = effectiveData.value
  if (!data) return null
  return {
    title: applyFootnotes(resolvedTitle.value),
    categories: formattedCategories.value.map(applyFootnotes),
    series: resolvedSeries.value.map((s) => ({
      name: applyFootnotes(s.name),
      data: s.data,
    })),
    seriesHexColors: data.series.map((s) => resolveHex(s.color)),
    categoryHexColors: data.categoryColors.map(resolveHex),
    typeOptions: (props.typeOptions ?? {}) as Record<string, unknown>,
    numberFormat: resolvedNumberFormat.value,
    isEditing,
  }
})

const typeOptionsBag = computed(
  () =>
    (props.typeOptions ?? {}) as {
      categoryFilter?: boolean
      categoryFilterLabel?: string
    },
)

const categoryFilterEnabled = computed(
  () => typeOptionsBag.value.categoryFilter === true,
)

const categoryFilterLabel = computed(
  () => typeOptionsBag.value.categoryFilterLabel ?? '',
)

const selectedCategoryIndex = ref(0)

const clampedSelectedIndex = computed(() => {
  const max = (renderProps.value?.categories.length ?? 0) - 1
  if (max < 0) return -1
  return Math.min(Math.max(selectedCategoryIndex.value, 0), max)
})

const showCategoryFilter = computed(() => {
  if (!categoryFilterEnabled.value) return false
  const base = renderProps.value
  if (!base) return false
  return base.categories.length > 1 && base.series.length > 0
})

const finalRenderProps = computed<ChartTypeRenderProps | null>(() => {
  const base = renderProps.value
  if (!base) return null
  if (!categoryFilterEnabled.value) return base
  const idx = clampedSelectedIndex.value
  if (idx < 0) return base
  return {
    ...base,
    categories: base.series.map((s) => s.name),
    series: [
      {
        name: base.categories[idx] ?? '',
        data: base.series.map((s) => s.data[idx] ?? 0),
      },
    ],
    // The original series colors become per-bar colors via the
    // category-color slot — types that natively colour per category
    // (bar in filter mode, donut, pie) pick them up automatically.
    categoryHexColors: base.seriesHexColors,
    seriesHexColors: [base.seriesHexColors[0] ?? '#888888'],
  }
})
</script>
