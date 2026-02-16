import type { BlokkliIcon } from '#blokkli-build/icons'

export type TranslateFunction = (key: string, fallback: string) => string

export type ChartBuildContext = {
  title: string
  categories: string[]
  series: Array<{ name: string; color: string; data: number[] }>
  seriesColors: string[]
  categoryColors: string[]
  typeOptions: Record<string, unknown>
}

export type ChartOptionGroup = 'display' | 'labels'

export type ChartTypeOptionToggle = {
  type: 'toggle'
  label: string
  group: ChartOptionGroup
}

export type ChartTypeOptionSelect = {
  type: 'select'
  label: string
  options: Array<{ value: string; label: string }>
}

export type ChartTypeOptionDefinition =
  | ChartTypeOptionToggle
  | ChartTypeOptionSelect

export type ChartTypeDefinition = {
  id: string
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  optionDefaults: Record<string, unknown>
  buildChartOptions: (ctx: ChartBuildContext) => Record<string, any>
  buildSeries: (ctx: ChartBuildContext) => any
  editor: {
    label: string
    icon: BlokkliIcon
    options: Record<string, ChartTypeOptionDefinition>
  }
}

export type ChartTypeFactory = ($t: TranslateFunction) => ChartTypeDefinition
