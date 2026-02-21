import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../../global/types/blockOptions'

export type TranslateFunction = (key: string, fallback: string) => string

export type ChartBuildContext<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  title: string
  categories: string[]
  series: Array<{ name: string; color: string; data: number[] }>
  seriesColors: string[]
  categoryColors: string[]
  typeOptions: T
}

export type ChartTypeDefinition<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
  buildChartOptions: (ctx: ChartBuildContext<T>) => Record<string, any>
  buildSeries: (ctx: ChartBuildContext<T>) => any
  editor: {
    label: string
    icon: BlokkliIcon
    options: Record<string, BlockOptionDefinitionBase<BlokkliIcon>>
  }
}

export type ChartTypeFactory<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ($t: TranslateFunction) => ChartTypeDefinition<T>
