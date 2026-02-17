import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../../global/types/blockOptions'

export type TranslateFunction = (key: string, fallback: string) => string

export type ChartBuildContext = {
  title: string
  categories: string[]
  series: Array<{ name: string; color: string; data: number[] }>
  seriesColors: string[]
  categoryColors: string[]
  typeOptions: Record<string, unknown>
}

export type ChartTypeDefinition = {
  id: string
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  buildChartOptions: (ctx: ChartBuildContext) => Record<string, any>
  buildSeries: (ctx: ChartBuildContext) => any
  editor: {
    label: string
    icon: BlokkliIcon
    options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>>
  }
}

export type ChartTypeFactory = ($t: TranslateFunction) => ChartTypeDefinition
