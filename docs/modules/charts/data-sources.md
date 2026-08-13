# Data Sources

A chart's data can come from two places:

- **Inline data** — `categories` and `series` entered in the editor and stored
  on the block. This is the default and needs no backend integration.
- **Dynamic data source** — the chart holds a reference to an external source,
  and the values are fetched at render time. This requires the adapter methods
  and the runtime fetch described below.

## Inline data

When data is entered in the editor it is stored on the block as part of the
`BlokkliChartData` value (`categories`, `series`, `categoryColors`). Nothing
else is required — `ChartRenderer` renders straight from the stored values.

## Adapter extension

To offer dynamic data sources, implement three optional methods on your adapter.
Their types are available from `#blokkli/charts/adapter`:

```typescript
interface BlokkliAdapter<T> {
  /** Tell the editor how to call `getChartDataSources`. */
  getChartDataSourceCapabilities?():
    | Promise<ChartDataSourceCapabilities>
    | ChartDataSourceCapabilities

  /** List (or search) the available data sources. */
  getChartDataSources?(args: {
    text?: string
    page?: number
  }): Promise<ChartDataSource[] | BlokkliAdapterSearchResults<ChartDataSource>>

  /** Fetch the actual data for one source — used for the editor preview. */
  getChartDataSourceData?(args: { id: string }): Promise<ChartDataSourcePayload>
}
```

```typescript
type ChartDataSource = {
  id: string
  label: string
  description?: string
}

type ChartDataSourceCapabilities = {
  /**
   * true  → getChartDataSources is called with { text, page } and returns
   *         BlokkliAdapterSearchResults<ChartDataSource> (backend search).
   * false → it is called once with no args and returns the full
   *         ChartDataSource[]; the editor filters client-side.
   */
  supportsSearch: boolean
}

type ChartDataSourcePayload = {
  categories: string[]
  series: { name: string; data: number[] }[]
}
```

`getChartDataSourceCapabilities` is the switch: implementing it enables the
"Dynamic data" option in the editor. `getChartDataSourceData` powers the
editor's live preview; the **frontend fetch is your block's responsibility**
(next section).

## How a bound source is stored

When a chart is bound to a source, the block stores a `dataSource` reference.
The inline `categories` / `series` are kept as a snapshot (so switching back to
custom data restores the user's input) but are **ignored at render time**.

```typescript
type ChartDataSourceRef = {
  id: string
  /** Cached label, shown if the live source is later removed. */
  label: string
  /** Per-series presentation overrides, keyed by fetched series name. */
  seriesOverrides?: Record<string, ChartSeriesOverride>
  /** Per-category color overrides (pie/donut), keyed by fetched category. */
  categoryColorOverrides?: Record<string, string>
}

type ChartSeriesOverride = {
  color?: string
  hidden?: boolean
}
```

`ChartRenderer` applies these overrides on top of the fetched payload —
assigning colors (falling back to the palette), and dropping hidden series.

## Fetching at render time

`ChartRenderer` does **not** fetch dynamic data itself. Your block component
watches the bound source id, fetches the payload, and passes it via the
`dynamic-data` prop:

```vue
<template>
  <ChartRenderer
    v-if="hasRenderableData"
    v-bind="chartData!"
    :dynamic-data="dynamicData"
  />
</template>

<script lang="ts" setup>
import { defineBlokkli, computed, ref, watch } from '#imports'
import { ChartRenderer } from '#blokkli/charts/components'
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'

const { options } = defineBlokkli({
  bundle: 'chart',
  options: {
    data: {
      type: 'json',
      label: 'Chart data',
      default: '{}',
      dataType: 'chart',
    },
  },
  editor: { addBehaviour: 'complex-option:data', disableEdit: true },
})

const chartData = computed<BlokkliChartData | null>(() => options.value.data)
const sourceId = computed(() => chartData.value?.dataSource?.id)
const dynamicData = ref<ChartDataSourcePayload | null>(null)

watch(
  sourceId,
  async (id) => {
    if (!id) {
      dynamicData.value = null
      return
    }
    if (import.meta.server) return
    try {
      dynamicData.value = await $fetch<ChartDataSourcePayload>(
        `/api/chart-data/${id}`,
      )
    } catch {
      dynamicData.value = null
    }
  },
  { immediate: true },
)

const hasRenderableData = computed(() => {
  if (!chartData.value) return false
  if (chartData.value.type === 'advanced') {
    return !!chartData.value.advancedConfig?.parsed
  }
  // For dynamic sources, defer to ChartRenderer — inside the editor it falls
  // back to the preview inject when the runtime fetch hasn't completed yet.
  if (chartData.value.dataSource) return true
  return (chartData.value.series?.length ?? 0) > 0
})
</script>
```

Notes:

- Guard the fetch with `import.meta.server` and fetch on the client, or fetch
  server-side with your own SSR-friendly strategy — the endpoint and caching are
  up to you.
- Inside the editor preview, `ChartRenderer` falls back to an injected preview
  payload (from `getChartDataSourceData`) when no `dynamic-data` prop is passed,
  so charts preview correctly while editing.

## Translations and dynamic data

[Translations](/modules/charts/chart-types#translations) use positional array
alignment against the inline source data, so they are **not applied** to dynamic
data — the fetched series/categories may differ in order or count. Localize
dynamic data on the backend instead.
