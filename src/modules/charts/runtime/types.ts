export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'area'
  | 'donut'
  | 'heatmap'
  | 'radialBar'
  | 'radar'

export type ChartSeries = {
  name: string
  /**
   * The color identifier as defined in the module options.
   */
  color: string
  data: number[]
}

export type BlokkliChartData = {
  title: string
  type: ChartType
  categories: string[]
  series: ChartSeries[]
  /**
   * Color identifiers per category, used for pie/donut charts where each
   * slice has its own color.
   */
  categoryColors: string[]
  footnotes: string[]
  typeOptions?: Record<string, unknown>
}

export type ChartColor = {
  color: string
  label: string
}
