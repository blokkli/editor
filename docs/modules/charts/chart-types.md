# Chart Types

The charts module ships ten built-in chart types. The selected type is stored as
`type` on the [`BlokkliChartData`](/modules/charts/setup#data-model) object, and
each type reads its own `typeOptions`.

## Built-in types

| id           | Label       | Colors   | Best for                                                    |
| ------------ | ----------- | -------- | ----------------------------------------------------------- |
| `bar`        | Bar         | series   | Comparing values across categories (ranking, side-by-side). |
| `line`       | Line        | series   | Trends across a continuous range.                           |
| `area`       | Area        | series   | Trends where the filled area emphasises volume.             |
| `radar`      | Radar       | series   | Comparing several variables across categories.              |
| `heatmap`    | Heatmap     | —        | Values across two dimensions via colour intensity.          |
| `pie`        | Pie         | category | Proportional shares of a whole.                             |
| `donut`      | Donut       | category | Shares of a whole with a free centre for a total.           |
| `radialBar`  | Radial Bar  | category | KPIs / progress as concentric circular bars.                |
| `agePyramid` | Age pyramid | series   | Back-to-back horizontal bars by category.                   |
| `advanced`   | Advanced    | —        | A raw ECharts configuration. Full control, no data table.   |

## Color model

Each type declares how it uses color:

- **Series colors** (`hasSeriesColors`) — `bar`, `line`, `area`, `radar`,
  `agePyramid`. Each series carries its own `color`. These are multi-series
  charts.
- **Category colors** (`hasCategoryColors`) — `pie`, `donut`, `radialBar`. These
  are single-series charts where each category (slice/segment) gets a color from
  `categoryColors`.
- **Neither** — `heatmap` derives color from value intensity; `advanced` defines
  its own colors in the raw config.

## Shared type options

These options come from shared helpers and appear on multiple types. Store them
under `typeOptions`.

| Option                | Type    | Default    | Notes                                                            |
| --------------------- | ------- | ---------- | ---------------------------------------------------------------- |
| `xaxisRotation`       | radios  | `'auto'`   | Category label rotation: `auto`, `-45`, `-90`.                   |
| `dataLabels`          | boolean | `false`    | Show values directly on chart elements.                          |
| `legendPosition`      | radios  | `'bottom'` | `bottom`, `top`, `right`.                                        |
| `gridLines`           | boolean | `true`     | Show background grid lines.                                      |
| `strokeWidth`         | radios  | `'2'`      | Line thickness: `2` (thin), `4` (medium), `6` (thick).           |
| `yaxisMin`            | number  | _unset_    | Nullable. Forces the value-axis start; unset auto-scales.        |
| `categoryFilter`      | boolean | `false`    | Renders a category picker so viewers see one category at a time. |
| `categoryFilterLabel` | text    | `''`       | Label next to the picker (only when `categoryFilter` is on).     |

Which shared options a type uses:

- `bar` — `xaxisRotation`, `dataLabels`, `legendPosition`, `gridLines`,
  `yaxisMin`, `categoryFilter`
- `line` / `area` — the bar set **plus** `strokeWidth`
- `radar` — `dataLabels`, `legendPosition`, `categoryFilter`
- `heatmap` — `xaxisRotation`, `legendPosition`, `gridLines`, `categoryFilter`
- `agePyramid` — `dataLabels`, `gridLines`, `legendPosition`
- `pie` / `donut` / `radialBar` — `categoryFilter`

## Per-type options

On top of the shared options, each type adds its own:

| Type         | Option         | Type    | Default | Choices / notes                                                                                                        |
| ------------ | -------------- | ------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `bar`        | `stacked`      | boolean | `false` | Stack series.                                                                                                          |
|              | `horizontal`   | boolean | `false` | Render bars horizontally.                                                                                              |
|              | `borderRadius` | radios  | `'0'`   | `0` none, `4` small, `8` large.                                                                                        |
| `line`       | `curved`       | boolean | `false` | Smooth line.                                                                                                           |
|              | `markers`      | boolean | `false` | Show point markers.                                                                                                    |
| `area`       | `curved`       | boolean | `false` | Smooth line.                                                                                                           |
|              | `markers`      | boolean | `false` | Show point markers.                                                                                                    |
| `radar`      | `markers`      | boolean | `false` | Show point markers.                                                                                                    |
|              | `fillOpacity`  | radios  | `'0.2'` | `0.2`, `0.4`, `0.8`.                                                                                                   |
| `pie`        | `showLabels`   | boolean | `true`  | Show slice labels.                                                                                                     |
| `donut`      | `showTotal`    | boolean | `false` | Show a total in the centre.                                                                                            |
|              | `showLabels`   | boolean | `true`  | Show segment labels.                                                                                                   |
| `radialBar`  | `showLabels`   | boolean | `true`  | Show labels.                                                                                                           |
| `agePyramid` | `splitIndex`   | number  | _unset_ | Nullable. Series index that starts on the right; earlier series render on the left. Defaults to half the series count. |

Nullable options (`yaxisMin`, `splitIndex`) can be reset to "auto" by setting
the key to `null`.

## Number & date formatting

`numberFormat` controls axes, data labels, and tooltips:

```typescript
type ChartNumberFormat = {
  /** BCP-47 locale, e.g. 'de-CH'. Empty = browser default. */
  locale?: string
  /** Forced fraction digits (0–4). */
  decimals?: number
  /** Inserted before the number, e.g. 'CHF '. */
  prefix?: string
  /** Appended after the number, e.g. ' kg', '%'. */
  suffix?: string
  /** 'standard' (1'234'500) or 'compact' (1.2M). */
  notation?: 'standard' | 'compact'
}
```

`dateFormat` is applied to category labels that look like dates (the renderer
auto-detects formats like `MM/YYYY`, `YYYY-MM`, `YYYY-MM-DD`, `DD.MM.YYYY`). The
locale is reused from `numberFormat.locale`:

```typescript
type ChartDateFormat = {
  /** 'auto' picks a style from the detected granularity. */
  style?:
    | 'auto'
    | 'none'
    | 'monthYearShort'
    | 'monthYearLong'
    | 'monthOnly'
    | 'monthYearNumeric'
    | 'iso'
    | 'dateShort'
    | 'dateLong'
    | 'yearOnly'
}
```

## Translations

Translatable strings can be overridden per language via `translations`, keyed by
language code. Arrays are **positionally aligned** to the source arrays (empty
string = fall back to source). Translations apply to inline data only — they are
skipped for [dynamic data sources](/modules/charts/data-sources), where
positions would not be stable.

```typescript
type ChartTranslation = {
  title?: string
  categories?: string[]
  seriesNames?: string[]
  footnotes?: string[]
  /** Override number-format prefix/suffix per language. */
  prefix?: string
  suffix?: string
}
```

## The `advanced` type

The `advanced` type stores a raw ECharts option object instead of structured
series and categories:

```typescript
type ChartAdvancedConfig = {
  /** Parsed ECharts option — what the renderer consumes. */
  parsed: Record<string, unknown>
  /** Raw textarea text (JSON5-tolerant). Editor-only; stripped on save. */
  source?: string
}
```

The renderer reads `advancedConfig.parsed` directly. Shared and per-type options
do not apply.

## See also

- [Custom Chart Types](/modules/charts/custom-chart-types) — define your own
  type.
