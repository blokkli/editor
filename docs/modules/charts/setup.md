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

## Styling / theming

Everything about a chart's appearance _other_ than colors — fonts, font sizes,
axis and grid-line styling, label spacing, plot margins, line widths, legend
placement, tooltip styling — is owned by the integrator through a single
`transform` hook. Each built-in chart type computes a complete, neutral
[ECharts option](https://echarts.apache.org/en/option.html); your `transform`
receives it (plus the resolved data) and returns the option to render:

```vue
<ChartRenderer
  v-if="hasRenderableData"
  v-bind="chartData!"
  :transform="transform"
/>
```

```ts
import type { EChartsOption } from 'echarts'
import type { ChartOptionTransform } from '#blokkli/charts/types'

// Owns appearance. Colors come from the editor via `context.*HexColors`
// (already applied on the option) — read them, never replace them.
const transform: ChartOptionTransform = (option: EChartsOption, context) => {
  option.textStyle = { fontFamily: 'Arial, sans-serif', ...option.textStyle }

  // Per-type rules a flat theme can't express: legend right for pie/donut,
  // top for everything else. Placement lives in the option, so ECharts does
  // not re-center it.
  if (option.legend && !Array.isArray(option.legend)) {
    const toRight = context.type === 'pie' || context.type === 'donut'
    option.legend = toRight
      ? { ...option.legend, right: 0, top: 'middle', orient: 'vertical' }
      : { ...option.legend, top: 0, left: 'center', bottom: undefined }
  }
  return option
}
```

**Typing.** Both the argument and return are ECharts' own `EChartsOption`.
Components (`option.legend`, `grid`, `xAxis`, `tooltip`, …) are precisely typed.
`option.series` is a union across all chart types — narrow by `series.type` (or
`context.type`) to reach type-specific fields like pie `radius` or line
`smooth`. `context.type` is a `string`; import `ChartTypeId` from
`#blokkli-build/charts-definitions` for the strongly-typed union.

The hook can also **ignore** the incoming option and return a fresh one built
from `context` — full control with zero blökkli defaults.

The prop is a runtime value, so compute it reactively (e.g. from the active
color mode or CSS design tokens) to keep charts in sync with the rest of your
site. The editor preview renders through your block component, so the same
`transform` is reflected while editing — no extra wiring needed.

## Sizing

Charts default to a height of **550px** and fill their container's width. The
height is a CSS custom property, so you size charts from userland with plain CSS
— no prop, no JS:

```css
/* Globally */
:root {
  --bk-chart-height: 400px;
}

/* Or per chart — set it on any ancestor of a ChartRenderer */
.hero-chart {
  --bk-chart-height: 70vh;
}
```

## Renderer & other vue-echarts options

The chart types render through
[`vue-echarts`](https://github.com/ecomfe/vue-echarts). blökkli never sets its
config props, so all four are controllable app-wide via `vue-echarts`'
provide/inject keys — no module changes needed:

| Concern                                 | Injection key         |
| --------------------------------------- | --------------------- |
| ECharts theme                           | `THEME_KEY`           |
| `init` options (renderer, device ratio) | `INIT_OPTIONS_KEY`    |
| `setOption` update options              | `UPDATE_OPTIONS_KEY`  |
| Loading spinner options                 | `LOADING_OPTIONS_KEY` |

blökkli bundles only the **Canvas** renderer. To switch every chart to **SVG**
(crisper print/export, accessible markup), register the SVG renderer and provide
it as the default `init` option from a client plugin — the SVG renderer enters
your bundle only because you import it here:

```ts
// plugins/echarts-svg.client.ts
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { INIT_OPTIONS_KEY } from 'vue-echarts'

export default defineNuxtPlugin((nuxtApp) => {
  use([SVGRenderer])
  nuxtApp.vueApp.provide(INIT_OPTIONS_KEY, { renderer: 'svg' })
})
```

A `.client` plugin is enough because `ChartRenderer` renders inside
`<ClientOnly>`. The same pattern applies to the other keys (e.g.
`provide(THEME_KEY, …)`).

## Data model

The chart option value is a `BlokkliChartData` object:

```typescript
type BlokkliChartData = {
  type: ChartType // chart-type id, e.g. 'bar' | 'pie' | 'advanced'
  title: string
  /** Value-axis title (e.g. 'Number of apartments'). Cartesian types only. */
  valueAxisTitle?: string
  /** Category-axis title (e.g. 'Year'). Cartesian types only. */
  categoryAxisTitle?: string
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
