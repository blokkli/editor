---
name: blokkli-setup-charts
description: >-
  Set up charts in a blökkli 2.x + Drupal project: a chart paragraph type whose
  chart is a block option of blökkli's charts module, rendered with
  ChartRenderer and styled like the site through the transform hook, the chart
  colours (colorOptions), and dynamic data sources through the adapter. Use when
  editors should create bar, line or pie charts, when charts look out of place
  on the site, when the chart editor offers no colours or no "Dynamic data", or
  when a chart shows the wrong language, clipped labels or nothing.
license: MIT
compatibility: >-
  Requires a working blökkli + Drupal setup (see the blokkli-setup-drupal
  skill): @blokkli/editor 2.x with the drupal and charts modules and
  paragraphs_blokkli 2.x, plus access to the Drupal backend (drush, config
  export) and the Nuxt project.
metadata:
  author: blokkli
  version: '1.0.0'
  targets: '@blokkli/editor 2.x, paragraphs_blokkli 2.x'
  docs: https://docs.blokk.li/modules/charts/
---

# Charts

blökkli's charts module stores a whole chart (type, data, colours, number
format, footnotes, translations) in one block option and draws it with ECharts.
Editors build it in the chart editor; the site decides how it looks.

The docs: [setup](https://docs.blokk.li/modules/charts/setup),
[chart types](https://docs.blokk.li/modules/charts/chart-types),
[data sources](https://docs.blokk.li/modules/charts/data-sources). This skill is
the procedure and the traps.

## 1. The paragraph type

The chart is a block option, not a field:

- **A paragraph type without fields,** e.g. `chart`, with the behaviour "blökkli
  data" (`paragraphs_blokkli_data`) like every other type.
- **Allow it** in the paragraphs fields that should hold charts (e.g. wherever
  tables are allowed).
- **GraphQL:** the bundle under `bundles` on the server. There are no fields to
  expose, and Nuxt needs no GraphQL fragment for it.
- **No content translation** for the type: its texts are translated in the chart
  editor (section 4). Translate the type's label as config.
- **The options schema:** the chart option lands in the schema file
  (`schemaOptionsPath`); Drupal's own form shows it as a JSON textarea.

Details for paragraph types in general: the `blokkli-add-paragraph-type` skill.

## 2. The component

`components/Paragraph/Chart/index.vue`:

```vue
<template>
  <div :class="{ hidden: !hasChart && !isEditing }">
    <ChartRenderer v-if="hasChart" :data="chartData!" :transform />
    <p v-else>No data yet: edit the chart to add some.</p>
  </div>
</template>

<script lang="ts" setup>
import { ChartRenderer } from '#blokkli/charts/components'
import type { BlokkliChartData } from '#blokkli/charts/types'

const { options } = defineBlokkli({
  bundle: 'chart',
  // ECharts is large: only pages with a chart load it. Add the name to the
  // module's `chunkNames`.
  chunkName: 'chart',
  options: {
    data: {
      type: 'json',
      label: 'Chart',
      default: '{}',
      dataType: 'chart',
    },
  },
  editor: {
    icon: 'bk_mdi_bar_chart',
    previewWidth: 800,
    addBehaviour: 'complex-option:data',
    disableEdit: true,
  },
})

const chartData = computed<BlokkliChartData | null>(() => options.value.data)

const hasChart = computed(() => {
  const data = chartData.value
  if (!data?.type) return false
  if (data.type === 'advanced') return !!data.advancedConfig?.parsed
  return !!data.dataSource || (data.series?.length ?? 0) > 0
})

const isEditing = import.meta.blokkliEditing
</script>
```

- **`dataType: 'chart'`** on a `json` option connects it to the chart editor.
- **`addBehaviour: 'complex-option:data'`** opens the chart editor when an
  editor adds the paragraph.
- **`ChartRenderer` takes the chart as `:data`,** not spread with `v-bind`.
- **One root element, always rendered while editing,** as for every paragraph.

## 3. The title

The chart editor has a "Title" setting, translated in its Translate panel.
Render it as the figure's caption, not in the chart: ECharts draws text that
doesn't wrap, in its own font.

```ts
const title = computed(
  () =>
    chartData.value?.translations?.[language]?.title || chartData.value?.title,
)
```

- **Footnote markers:** editors write `{1}` in texts; `ChartRenderer` turns them
  into ¹ in the chart. Do the same in the caption.
- **Hide the chart's own title** in the transform
  (`option.title = { show: false }`).

## 4. Colours and translations

**Colours** are blökkli's `colorOptions` in `nuxt.config.ts`, not a charts
setting:

```ts
colorOptions: {
  lake: {
    label: 'Lake',
    mainShade: '600',
    shades: { 100: '#e2f0ff', /* … */ 600: '#1f5a8c', 700: '#104a79' },
  },
  // …
},
```

- **Keep them with the design system:** e.g. a module (`shared/chartColors.ts`)
  that `nuxt.config.ts` imports, and the style guide shows.
- **The main shades, in this order, are the palette** of new charts and of data
  sources' series. Editors pick any shade.
- **Base the families on the site's colours,** and check every main shade
  against white: at least 3:1 for chart graphics. Order them so that neighbours
  differ in lightness, for red-green colour blindness.
- **A pie with more slices than families** repeats colours. Keep pies to about
  six slices ("Other" for the rest).
- **Labels are plain strings:** the editor shows them in every language.

**Translations:** the chart editor's Translate panel holds the title, axis
titles, series names, categories and footnotes per language, inside the option.
`ChartRenderer` picks the provider's language.

## 5. The site's style

Everything but the colours comes from the `transform` prop: it receives the
chart type's neutral ECharts option and the resolved data, and returns the
option to draw.

```ts
const transform: ChartOptionTransform = (option, context) => {
  const style = getComputedStyle(document.documentElement)
  option.textStyle = { fontFamily: style.getPropertyValue('--font-sans') }
  option.title = { show: false }
  // Axes, legend, tooltip, series by context.type …
  return option
}
```

- **Read the design tokens** (fonts, text and rule colours) from CSS: charts
  only render in the browser, so `getComputedStyle` works, and the charts follow
  the design system.
- **Never replace the series colours:** they're the editor's.
- **ECharts 6:** fit labels with `grid.outerBoundsMode: 'same'` and
  `outerBoundsContain`, not `containLabel` (it needs a legacy module and only
  warns).
- **Responsive options:** measure the chart's width in the component and pass it
  to a transform factory. ECharts' `media` queries (`baseOption`) report a
  missing timeline component and replace, rather than merge, the graphic.
- **SVG instead of canvas:** a canvas draws before the web font has loaded, and
  its text is blurry in print. Register the renderer where the chart renders and
  provide it to vue-echarts:

  ```ts
  import { use } from 'echarts/core'
  import { SVGRenderer } from 'echarts/renderers'
  import { AriaComponent } from 'echarts/components'
  import { INIT_OPTIONS_KEY } from 'vue-echarts'

  use([SVGRenderer, AriaComponent])
  provide(INIT_OPTIONS_KEY, { renderer: 'svg' })
  ```

- **Screen readers:** vue-echarts labels the chart as an image. Set the label in
  the transform (`option.aria = { enabled: true, label: { description } }`) from
  `context.title`, `context.series` and `context.categories`. ECharts' generated
  description is English and garbles stacked data.
- **Height:** the CSS custom property `--bk-chart-height` on any ancestor.
- **Footnotes and the category filter** are `ChartRenderer`'s: style them with
  `bk-chart-footnotes`, `bk-chart-footnote-marker` and
  `bk-chart-category-filter`. The filter's markup is the `categoryFilter` slot.

The editor's preview renders through the paragraph's component, so editors see
the site's style while they build the chart.

## 6. Dynamic data sources

A chart can be bound to data that the site keeps up to date (population,
budget). Three adapter methods in `blokkli.editAdapter.ts` enable the "Dynamic
data" tab:

```ts
getChartDataSourceCapabilities: () => ({ supportsSearch: false }),
getChartDataSources: () =>
  $fetch('/api/chart-data', { query: { language: ctx.value.language } }),
getChartDataSourceData: ({ id }: { id: string }) =>
  $fetch(`/api/chart-data/${id}`, { query: { language: ctx.value.language } }),
```

- **The endpoint is yours:** e.g. a Nuxt server route, or Drupal. It returns
  `{ id, label, description }` for the list and
  `{ categories, series: [{ name, data }] }` for a source.
- **Localize the data in the endpoint:** the chart editor's translations don't
  apply to dynamic data.
- **The component fetches the data itself** and passes it as `:dynamic-data`. In
  the browser only, keyed by the source and the language:

  ```ts
  const sourceId = computed(() => chartData.value?.dataSource?.id)
  const { data: dynamicData } = useLazyAsyncData(
    () => `chart-data:${sourceId.value}:${language.value}`,
    () =>
      sourceId.value
        ? $fetch(`/api/chart-data/${sourceId.value}`, {
            query: { language: language.value },
          })
        : Promise.resolve(null),
    { server: false },
  )
  ```

- **Overrides of a source's colours** are keyed by the fetched names. With
  localized names, they apply to one language only.

## 7. Check it

1. The type is in the schema, and the editor's sidebar offers it.
2. Add one: the chart editor opens. Its colours are yours, and with the adapter
   methods it has a "Dynamic data" tab listing the sources.
3. Build a bar, a line and a pie chart, one bound to a source. Translate them in
   the Translate panel. Publish.
4. In every language and at a phone's width: the caption, the site's font,
   nothing clipped, the footnotes, and no console errors.

## Traps, by symptom

- **The chart editor offers no "Dynamic data":**
  `getChartDataSourceCapabilities` is missing (section 6).
- **A chart looks like ECharts' demo:** no `transform` (section 5).
- **The text is in a fallback font, or blurry when printed:** canvas renderer
  (section 5).
- **The title shows twice, or doesn't wrap:** the chart draws its own title
  (section 3).
- **Labels are clipped at the edges:** `containLabel` in ECharts 6, or series
  labels outside the grid, e.g. to the right of horizontal bars (section 5).
- **`{1}` in the caption:** the footnote markers aren't converted (section 3).
- **A bound chart is empty on the site:** the component doesn't fetch the data
  (section 6).
- **A bound chart shows the wrong language:** the endpoint doesn't localize, or
  the fetch isn't keyed by the language (section 6).
- **Colours repeat in a pie:** more slices than colour families (section 4).
