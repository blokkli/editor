import type { ChartTypeDefinitionEntry, ChartTypeFactory } from '../../types'

/**
 * Declare a chart type. The id is the first positional argument so the
 * build-time `ChartTypeCollector` can statically extract it from the
 * source file without executing the factory.
 */
export function defineChartType<T extends Record<string, unknown>>(
  id: string,
  factory: ChartTypeFactory<T>,
): ChartTypeDefinitionEntry<T> {
  return { id, factory }
}
