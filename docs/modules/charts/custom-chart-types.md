# Custom Chart Types

You can register your own chart types alongside the built-in ones using the same
convention the module uses internally. The built-in types under
`src/modules/charts/runtime/blokkli/chart-types/` are the canonical reference
examples.

## The `blokkli/chart-types/` convention

Place each chart type in its own directory under `blokkli/chart-types/` at your
project root:

```
blokkli/chart-types/
└── myChart/
    ├── definition.ts     # editor metadata + options
    ├── render.vue        # how the chart is drawn (receives ChartTypeRenderProps)
    └── illustration.vue  # optional preview shown in the type picker
```

The build-time `ChartTypeCollector` discovers these directories automatically —
no registration code is required. It also picks up `chart-types/` directories
contributed by enabled modules.

## Defining a type

Use `defineChartType()` from `#blokkli/charts/definition`. The **id must be a
string literal** as the first argument — the collector extracts it statically
from the source without executing the factory:

```typescript
// blokkli/chart-types/myChart/definition.ts
import { defineChartType } from '#blokkli/charts/definition'

export type TypeOptions = {
  smooth: boolean
}

export default defineChartType<TypeOptions>('myChart', ($t) => ({
  hasSeriesColors: true,
  hasCategoryColors: false,
  editor: {
    label: $t('chartsTypeMyChart', 'My chart'),
    description: $t('chartsTypeMyChartDescription', 'A custom chart type.'),
    icon: 'bk_mdi_insert_chart',
    options: {
      smooth: {
        type: 'checkbox',
        label: $t('chartsMyChartSmooth', 'Smooth'),
        default: false,
        group: 'display',
      },
    },
  },
}))
```

Reuse the shared option helpers (`xAxisOptions`, `dataLabelsOptions`,
`legendOptions`, `gridOptions`, `strokeWidthOptions`, `yAxisMinOptions`,
`categoryFilterOptions`) from `#blokkli/charts/definition/options` and combine
them with `mergeShared()` — that is how the built-in types compose their option
sets.

## The render component

`render.vue` receives fully resolved
[`ChartTypeRenderProps`](/modules/charts/chart-types) (`title`, `categories`,
`series`, `seriesHexColors`, `categoryHexColors`, `typeOptions`, `numberFormat`,
`isEditing`, and — for the `advanced` type only — `advancedConfig`). It is
responsible for drawing the chart, typically with `vue-echarts`. Look at any
built-in type's `render.vue` for the pattern.

## Build output

On the next build the collector regenerates the chart-type templates and adds
your type to the generated `ChartTypeId` union, so it becomes available
everywhere the built-in types are — including the editor's type picker (using
`illustration.vue` if present, otherwise the definition's `icon`).
