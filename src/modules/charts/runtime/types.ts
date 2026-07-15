import type { EChartsOption } from 'echarts'
import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../global/types/blockOptions'

// ─── Chart-type API (types only) ─────────────────────────────────────────────

export type TranslateFunction = (key: string, fallback: string) => string

/**
 * Context object passed to `ChartOption.shouldRender`. Currently exposes the
 * current values of all type-options on the block; more fields may be added
 * here over time (e.g. resolved payload, chart-type id) without breaking
 * existing predicates.
 */
export type ChartOptionRenderContext = {
  /** Current values of all chart-type options on this block. */
  options: Record<string, unknown>
}

/**
 * A chart-type option definition. Extends the generic blökkli block option
 * schema with chart-specific extras — currently a `shouldRender` predicate
 * for conditional visibility in the editor.
 */
export type ChartOption = BlockOptionDefinitionBase<BlokkliIcon> & {
  /**
   * Optional predicate that decides whether this option is rendered in the
   * editor. Receives a context object so options can react to other
   * options' current values. When omitted the option is always rendered.
   *
   * @example
   * categoryFilterLabel: {
   *   type: 'text',
   *   …,
   *   shouldRender: ({ options }) => options.categoryFilter === true,
   * }
   */
  shouldRender?: (ctx: ChartOptionRenderContext) => boolean
}

export type ChartTypeDefinitionBody<
  _T extends Record<string, unknown> = Record<string, unknown>,
> = {
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  /**
   * Whether this type renders cartesian value/category axes. When true, the
   * editor offers the value/category axis-title inputs. Defaults to false.
   */
  hasAxes?: boolean
  editor: {
    label: string
    description: string
    icon: BlokkliIcon
    options: Record<string, ChartOption>
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
  /**
   * The chart-type id being rendered (e.g. `'bar'`, `'pie'`). Typed as
   * `ChartType` (= `string`) here; import `ChartTypeId` from
   * `#blokkli-build/charts-definitions` for the strongly-typed union.
   */
  type: ChartType
  title: string
  /** Resolved value-axis title (translated). Cartesian types set `axis.name`. */
  valueAxisTitle?: string
  /** Resolved category-axis title (translated). Cartesian types set `axis.name`. */
  categoryAxisTitle?: string
  categories: string[]
  series: { name: string; data: number[] }[]
  /** Hex colors aligned with `series` order. Read by types with series colors. */
  seriesHexColors: string[]
  /** Hex colors aligned with `categories` order. Read by types with category colors. */
  categoryHexColors: string[]
  typeOptions: Record<string, unknown>
  numberFormat?: ChartNumberFormat
  isEditing: boolean
  /**
   * Pre-parsed ECharts option object — only relevant for the `advanced`
   * chart type. Renderers for other types ignore this field.
   */
  advancedConfig?: Record<string, unknown>
  /**
   * Optional integrator hook to fully customize the final ECharts option.
   * Applied by {@link useChartOption} after the built-in type has computed
   * its (neutral) default option. See {@link ChartOptionTransform}.
   */
  transform?: ChartOptionTransform
}

/**
 * Context passed to a {@link ChartOptionTransform}: the fully-resolved render
 * props (data, editor-owned colors, semantic options, chart-type id) the
 * default option was built from. Everything needed to adjust or rebuild it.
 */
export type ChartTransformContext = Omit<ChartTypeRenderProps, 'transform'>

/**
 * Integrator-supplied hook that owns chart appearance. It receives the ECharts
 * option the built-in chart type computed (a complete, neutral default) plus
 * the resolved {@link ChartTransformContext}, and returns the option to render.
 * It may mutate a few fields, or ignore the input and return a fresh option
 * built from `context` (zero blökkli defaults). Colors in `context` are
 * editor-owned — style around them, don't replace them.
 *
 * Passed to `ChartRenderer` as the `transform` prop (runtime, not persisted);
 * typically computed reactively from color mode / design tokens.
 *
 * `option.series` is a union across all chart types — narrow by `series.type`
 * (or `context.type`) to reach type-specific fields like pie `radius`.
 */
export type ChartOptionTransform = (
  option: EChartsOption,
  context: ChartTransformContext,
) => EChartsOption

// ─── Shared TypeOptions interfaces ───────────────────────────────────────────
// Paired with the option-schema helpers in
// `chart-types/definition/options/index.ts`. Intersected by definition.ts
// `TypeOptions` exports and read by render.vue files.

export type XAxisTypeOptions = { xaxisRotation: string }
export type DataLabelsTypeOptions = { dataLabels: boolean }
export type YAxisMinTypeOptions = { yaxisMin: number | undefined }
export type CategoryFilterTypeOptions = {
  categoryFilter: boolean
  categoryFilterLabel: string
}

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
  valueAxisTitle?: string
  categoryAxisTitle?: string
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

/**
 * Storage shape for the `advanced` chart type. The renderer reads `parsed`
 * directly — no JSON parsing required. `source` is the textarea text
 * (JSON5-tolerant) and is editor-only: it is stripped before persisting.
 */
export type ChartAdvancedConfig = {
  /** Parsed ECharts option object — what the renderer consumes. */
  parsed: Record<string, unknown>
  /** Raw textarea text. Editor-only; stripped on save. */
  source?: string
}

type ChartDataBase = {
  title: string
  /**
   * Title of the value axis (the numeric scale), e.g. "Number of apartments".
   * Only rendered by chart types with cartesian axes (bar, line, area,
   * agePyramid); ignored by others. Its placement/appearance is left to the
   * integrator's `transform` — this is only the text.
   */
  valueAxisTitle?: string
  /**
   * Title of the category axis (the labels), e.g. "Year". Same rendering rules
   * as {@link ChartDataBase.valueAxisTitle}.
   */
  categoryAxisTitle?: string
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
  /**
   * Raw ECharts configuration, used only when `type === 'advanced'`.
   */
  advancedConfig?: ChartAdvancedConfig
}

export type BlokkliChartData = ChartDataBase & {
  type: ChartType
  typeOptions?: Record<string, unknown>
}
