import { definitions } from '#blokkli-build/charts-definitions'
import type {
  ChartTypeDefinition,
  ChartTypeDefinitionEntry,
  TranslateFunction,
} from '../types'

export type {
  ChartTypeOptionsMap,
  ChartTypeId,
} from '#blokkli-build/charts-definitions'

const noopT: TranslateFunction = (_key, fallback) => fallback

function resolve<T extends Record<string, unknown>>(
  entry: ChartTypeDefinitionEntry<T>,
  $t: TranslateFunction,
): ChartTypeDefinition<T> {
  return { id: entry.id, ...entry.factory($t) }
}

/**
 * Get a chart type definition using fallback labels (no real translations).
 * Used by agent tools that don't have access to `$t`.
 */
export function getChartTypeRuntime(
  id: string,
): ChartTypeDefinition | undefined {
  const entry = definitions.find((d) => d.id === id)
  return entry ? resolve(entry, noopT) : undefined
}

/**
 * Get all chart type definitions with translated labels.
 * Used by editor components only.
 */
export function getChartTypes($t: TranslateFunction): ChartTypeDefinition[] {
  return definitions.map((entry) => resolve(entry, $t))
}

/**
 * Get a single chart type definition with translated labels.
 * Used by editor components only.
 */
export function getChartType(
  id: string,
  $t: TranslateFunction,
): ChartTypeDefinition | undefined {
  const entry = definitions.find((d) => d.id === id)
  return entry ? resolve(entry, $t) : undefined
}

/**
 * Get the default type options for a chart type.
 */
export function getDefaultTypeOptions(id: string): Record<string, unknown> {
  const def = getChartTypeRuntime(id)
  if (!def) return {}
  const defaults: Record<string, unknown> = {}
  for (const [key, opt] of Object.entries(def.editor.options)) {
    defaults[key] = opt.default
  }
  return defaults
}
