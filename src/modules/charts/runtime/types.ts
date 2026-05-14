import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../global/types/blockOptions'

// ─── Chart-type API (types only) ─────────────────────────────────────────────

export type TranslateFunction = (key: string, fallback: string) => string

export type ChartTypeDefinitionBody<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  editor: {
    label: string
    description: string
    icon: BlokkliIcon
    options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>>
  }
}

export type ChartTypeFactory<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ($t: TranslateFunction) => ChartTypeDefinitionBody<T>

/** What `defineChartType` returns and what the registry stores. */
export type ChartTypeDefinitionEntry<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string
  factory: ChartTypeFactory<T>
}

/** Resolved at registry time. What downstream consumers see. */
export type ChartTypeDefinition<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ChartTypeDefinitionBody<T> & { id: string }

/**
 * The props every chart-type render component receives from `ChartRenderer`.
 * Values are fully resolved (translations, date formatting, footnotes,
 * dynamic-data overrides, hex colors).
 */
export type ChartTypeRenderProps = {
  title: string
  categories: string[]
  series: { name: string; data: number[] }[]
  /** Hex colors aligned with `series` order. Read by types with series colors. */
  seriesHexColors: string[]
  /** Hex colors aligned with `categories` order. Read by types with category colors. */
  categoryHexColors: string[]
  typeOptions: Record<string, unknown>
  numberFormat?: ChartNumberFormat
  isEditing: boolean
}

// ─── Shared TypeOptions interfaces ───────────────────────────────────────────
// Paired with the option-schema helpers in
// `chart-types/definition/options/index.ts`. Intersected by definition.ts
// `TypeOptions` exports and read by render.vue files.

export type XAxisTypeOptions = { xaxisRotation: string }
export type DataLabelsTypeOptions = { dataLabels: boolean }
export type LegendTypeOptions = { legendPosition: string }
export type GridTypeOptions = { gridLines: boolean }
export type StrokeWidthTypeOptions = { strokeWidth: string }
export type YAxisMinTypeOptions = { yaxisMin: number | undefined }

// ─── Chart-data types ────────────────────────────────────────────────────────

/**
 * Chart-type id. Plain `string` to avoid a circular type dependency with the
 * build-time `#blokkli-build/charts-definitions` template (whose generated
 * `.d.ts` imports types from this file). If you want a strongly-typed
 * union of known ids, import `ChartTypeId` from
 * `#blokkli-build/charts-definitions` directly.
 */
export type ChartType = string

export type ChartTypeOptions = Record<string, unknown>

export type ChartSeries = {
  name: string
  /** The color identifier as defined in the module options. */
  color: string
  data: number[]
}

export type ChartNumberFormat = {
  /** BCP-47 locale tag, e.g. 'de-CH', 'de-DE', 'en-US'. Empty = browser default. */
  locale?: string
  /** Forced fraction digits (0-4). Undefined leaves it to Intl. */
  decimals?: number
  /** String inserted before the formatted number, e.g. 'CHF '. */
  prefix?: string
  /** String appended after the formatted number, e.g. ' kg', '%'. */
  suffix?: string
  /** 'standard' for full numbers (1'234'500), 'compact' for short form (1.2M). */
  notation?: 'standard' | 'compact'
}

/**
 * Display style applied to category labels when they are detected as dates.
 * `auto` picks a sensible default based on the detected source granularity.
 */
export type ChartDateFormatStyle =
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

export type ChartDateFormat = {
  /** Display style. Falls back to `auto` if undefined. Locale is reused
   * from `numberFormat.locale`. */
  style?: ChartDateFormatStyle
}

/**
 * Translated strings for one target language.
 *
 * Arrays are positionally aligned to the source arrays (categories, series,
 * footnotes). Empty strings mean "no translation yet, fall back to source".
 */
export type ChartTranslation = {
  title?: string
  categories?: string[]
  seriesNames?: string[]
  footnotes?: string[]
  prefix?: string
  suffix?: string
}

/**
 * A backend-provided chart data source descriptor.
 */
export type ChartDataSource = {
  id: string
  label: string
  description?: string
}

/**
 * Capabilities flag set returned by the adapter to tell the editor how to
 * call `getChartDataSources`. Reserved for future flags.
 */
export type ChartDataSourceCapabilities = {
  /**
   * When true, `getChartDataSources` is called with `text` + `page` args
   * and is expected to return `BlokkliAdapterSearchResults<ChartDataSource>`.
   * When false, it is called once with no args and is expected to return
   * the full list as `ChartDataSource[]` (editor performs fuzzy filtering
   * client-side).
   */
  supportsSearch: boolean
}

/**
 * Raw data returned by `getChartDataSourceData` (editor) and by the
 * integrator's runtime fetch (passed via `ChartRenderer`'s `dynamicData`
 * prop).
 */
export type ChartDataSourcePayload = {
  categories: string[]
  series: { name: string; data: number[] }[]
}

/**
 * Per-series presentation overrides for dynamic data, keyed by the
 * fetched series name.
 */
export type ChartSeriesOverride = {
  color?: string
  hidden?: boolean
}

/**
 * Reference to a dynamic data source stored on a chart block.
 *
 * When set, the block's inline `categories` / `series` are ignored at
 * render time. Inline data is preserved as a "shadow" state so the user
 * can switch back to the custom-data tab without losing their input.
 */
export type ChartDataSourceRef = {
  id: string
  /** Cached label for display when the live source has been removed. */
  label: string
  /** Keyed by fetched series name. */
  seriesOverrides?: Record<string, ChartSeriesOverride>
  /** Keyed by fetched category label, used by pie/donut charts. */
  categoryColorOverrides?: Record<string, string>
}

type ChartDataBase = {
  title: string
  categories: string[]
  series: ChartSeries[]
  /**
   * Color identifiers per category, used for pie/donut charts where each
   * slice has its own color.
   */
  categoryColors: string[]
  footnotes: string[]
  numberFormat?: ChartNumberFormat
  dateFormat?: ChartDateFormat
  /**
   * Per-language translations of the translatable strings, keyed by
   * langcode. Chart options are not translatable in blökkli, so
   * translations live alongside the source data.
   */
  translations?: Record<string, ChartTranslation>
  /**
   * Optional reference to a dynamic data source. When set, the block
   * renders data fetched from the source at runtime (via the integrator's
   * fetching logic + the `dynamicData` prop on `ChartRenderer`). The
   * inline `categories` / `series` are kept as a snapshot so switching
   * back to custom data restores the user's last input.
   */
  dataSource?: ChartDataSourceRef
}

export type BlokkliChartData = ChartDataBase & {
  type: ChartType
  typeOptions?: Record<string, unknown>
}
