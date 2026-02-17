import type {
  TranslateFunction,
  ChartTypeDefinition,
  ChartTypeFactory,
} from './types'

import barFactory from './bar'
import lineFactory from './line'
import areaFactory from './area'
import pieFactory from './pie'
import donutFactory from './donut'
import heatmapFactory from './heatmap'
import radialBarFactory from './radialBar'
import radarFactory from './radar'

const factories: ChartTypeFactory[] = [
  barFactory,
  lineFactory,
  pieFactory,
  areaFactory,
  donutFactory,
  heatmapFactory,
  radialBarFactory,
  radarFactory,
]

const noopT: TranslateFunction = (_key, fallback) => fallback

const runtimeCache: Record<string, ChartTypeDefinition> = {}

function ensureRuntimeCache() {
  if (Object.keys(runtimeCache).length === 0) {
    for (const factory of factories) {
      const def = factory(noopT)
      runtimeCache[def.id] = def
    }
  }
}

/**
 * Get a chart type definition using fallback labels (no real translations).
 * Used by ChartRenderer which runs in both edit mode and production.
 */
export function getChartTypeRuntime(
  id: string,
): ChartTypeDefinition | undefined {
  ensureRuntimeCache()
  return runtimeCache[id]
}

/**
 * Get all chart type definitions with translated labels.
 * Used by editor components only.
 */
export function getChartTypes($t: TranslateFunction): ChartTypeDefinition[] {
  return factories.map((factory) => factory($t))
}

/**
 * Get a single chart type definition with translated labels.
 * Used by editor components only.
 */
export function getChartType(
  id: string,
  $t: TranslateFunction,
): ChartTypeDefinition | undefined {
  return getChartTypes($t).find((def) => def.id === id)
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

export type {
  ChartTypeDefinition,
  ChartBuildContext,
  TranslateFunction,
} from './types'
