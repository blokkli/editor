import type { ChartTypeOptionsMap } from './chartTypes/index'

export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'donut'
  | 'heatmap'
  | 'radialBar'
  | 'radar'

export type ChartTypeOptions = ChartTypeOptionsMap[ChartType]

export type ChartSeries = {
  name: string
  /**
   * The color identifier as defined in the module options.
   */
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

export type BlokkliChartData = {
  [K in ChartType]: ChartDataBase & {
    type: K
    typeOptions?: Partial<ChartTypeOptionsMap[K]>
  }
}[ChartType]
