# Charts Setup

## Enable the module

Import the charts module and add it to the `blokkli.modules` array in your
`nuxt.config.ts`:

```typescript
import charts from '@blokkli/editor/charts'

export default defineNuxtConfig({
  modules: ['@blokkli/editor'],

  blokkli: {
    modules: [charts()],
  },
})
```

The module registers its runtime dependencies (`echarts`, `vue-echarts`,
`json5`, and `zod`) automatically — they are only pre-bundled when the charts
module is enabled.

## Declare a chart block

A chart is stored on a block as a **`json` option with `dataType: 'chart'`**.
The `dataType` binds that option to the `chart` complex-option editor registered
by the module. You do not use `type: 'chart'` directly.

```vue
<script lang="ts" setup>
import { defineBlokkli, computed } from '#imports'
import { ChartRenderer } from '#blokkli/charts/components'
import type { BlokkliChartData } from '#blokkli/charts/types'

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
  editor: {
    previewWidth: 800,
    icon: 'bk_mdi_area_chart',
    // Open the chart editor directly when the block is added.
    addBehaviour: 'complex-option:data',
    // The block has no inline-editable content; editing happens in the
    // chart editor, so disable the generic edit action.
    disableEdit: true,
  },
})

const chartData = computed<BlokkliChartData | null>(() => options.value.data)
</script>
```

- `dataType: 'chart'` — connects the JSON option to the chart editor.
- `addBehaviour: 'complex-option:data'` — adding the block immediately opens the
  chart editor for the `data` option (use the option key you chose).
- `disableEdit: true` — there is nothing to edit inline on the block itself.

## Render the chart

Render the stored data with `ChartRenderer` from `#blokkli/charts/components`.
Spread the resolved `BlokkliChartData` onto it with `v-bind`:

```vue
<template>
  <div class="container mx-auto my-20">
    <ChartRenderer v-if="hasRenderableData" v-bind="chartData!" />
    <div v-else>No chart data. Click "Edit chart" to add data.</div>
  </div>
</template>

<script lang="ts" setup>
// ...continued from above
const hasRenderableData = computed(() => {
  if (!chartData.value) return false
  if (chartData.value.type === 'advanced') {
    return !!chartData.value.advancedConfig?.parsed
  }
  if (chartData.value.dataSource) return true
  return (chartData.value.series?.length ?? 0) > 0
})
</script>
```

`ChartRenderer` handles everything internally: applying translations for the
active language, formatting dates and numbers, resolving color IDs to hex, and
picking the right type-specific render component. For binding a chart to backend
data, see [Data Sources](/modules/charts/data-sources) — it adds a
`:dynamic-data` prop.

## Colors

Series and category colors are **blökkli color IDs**, not a charts-module
setting. At render time they are resolved to hex via the editor's global color
configuration (`resolveColorHex` / `colorPalette` from
`useBlokkliRuntimeConfig`). New charts auto-assign colors by cycling through the
configured palette. Configure the available colors as part of your blökkli setup
— see [Configuration](/configuration) and [Themes](/editor/themes).

## Data model

The chart option value is a `BlokkliChartData` object:

```typescript
type BlokkliChartData = {
  type: ChartType // chart-type id, e.g. 'bar' | 'pie' | 'advanced'
  title: string
  categories: string[]
  series: ChartSeries[]
  /** Color IDs per category — used by pie/donut/radialBar. */
  categoryColors: string[]
  footnotes: string[]
  numberFormat?: ChartNumberFormat
  dateFormat?: ChartDateFormat
  /** Per-language overrides of translatable strings, keyed by langcode. */
  translations?: Record<string, ChartTranslation>
  /** When set, inline categories/series are ignored at render time. */
  dataSource?: ChartDataSourceRef
  /** Raw ECharts config — only when `type === 'advanced'`. */
  advancedConfig?: ChartAdvancedConfig
  /** Type-specific rendering options (e.g. { stacked: true }). */
  typeOptions?: Record<string, unknown>
}

type ChartSeries = {
  name: string
  /** A blökkli color ID. */
  color: string
  data: number[]
}
```

`numberFormat`, `dateFormat`, `translations`, `typeOptions`, `dataSource`, and
`advancedConfig` are detailed on the [Chart Types](/modules/charts/chart-types)
and [Data Sources](/modules/charts/data-sources) pages.

## Module options

| Option                 | Type     | Description                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------------ |
| `chartRenderComponent` | `string` | Path to a custom component used to render charts. _Not yet implemented._ |

## Aliases

With the module enabled you can import from:

- `#blokkli/charts/types` — chart-related TypeScript types
- `#blokkli/charts/definition` — the `defineChartType()` helper
- `#blokkli/charts/components` — runtime components (e.g. `ChartRenderer`)
- `#blokkli/charts/adapter` — adapter types for dynamic data sources
