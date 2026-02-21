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
}

export type BlokkliChartData = {
  [K in ChartType]: ChartDataBase & {
    type: K
    typeOptions?: Partial<ChartTypeOptionsMap[K]>
  }
}[ChartType]

export type ChartColor = {
  color: string
  label: string
}
