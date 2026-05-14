import type { ChartTypeFactory } from './types'

export function defineChartType<T extends Record<string, unknown>>(
  factory: ChartTypeFactory<T>,
): ChartTypeFactory<T> {
  return factory
}
