import type { BlokkliIcon } from '#blokkli-build/icons'
import type { BlockOptionDefinitionBase } from '../../../../global/types/blockOptions'

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

/**
 * What `defineChartType` returns and what the registry stores.
 */
export type ChartTypeDefinitionEntry<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string
  factory: ChartTypeFactory<T>
}

/**
 * Resolved at registry time. What downstream consumers see.
 */
export type ChartTypeDefinition<
  T extends Record<string, unknown> = Record<string, unknown>,
> = ChartTypeDefinitionBody<T> & { id: string }

export { defineChartType } from './define'
