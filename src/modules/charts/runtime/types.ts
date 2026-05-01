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
}

export type BlokkliChartData = {
  [K in ChartType]: ChartDataBase & {
    type: K
    typeOptions?: Partial<ChartTypeOptionsMap[K]>
  }
}[ChartType]
