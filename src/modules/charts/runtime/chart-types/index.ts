import type {
  TranslateFunction,
  ChartTypeDefinition,
  ChartTypeFactory,
} from './types'

import type { TypeOptions as BarTypeOptions } from './bar/meta'
import type { TypeOptions as PieTypeOptions } from './pie/meta'
// Type-only imports for the unported chart types. Elided at runtime, so
// they don't drag the Apex-shaped factory code into the bundle. The
// runtime registry below only ships bar and pie. See the plan for context.
import type { TypeOptions as LineTypeOptions } from './line'
import type { TypeOptions as AreaTypeOptions } from './area'
import type { TypeOptions as DonutTypeOptions } from './donut'
import type { TypeOptions as HeatmapTypeOptions } from './heatmap'
import type { TypeOptions as RadialBarTypeOptions } from './radialBar'
import type { TypeOptions as RadarTypeOptions } from './radar'

import barFactory from './bar/meta'
import pieFactory from './pie/meta'

export type ChartTypeOptionsMap = {
  bar: BarTypeOptions
  line: LineTypeOptions
  area: AreaTypeOptions
  pie: PieTypeOptions
  donut: DonutTypeOptions
  heatmap: HeatmapTypeOptions
  radialBar: RadialBarTypeOptions
  radar: RadarTypeOptions
}

const factories: ChartTypeFactory<any>[] = [barFactory, pieFactory]

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
