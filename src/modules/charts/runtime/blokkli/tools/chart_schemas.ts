import { z } from 'zod'
import type { BlokkliChartData } from '#blokkli/charts/types'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { ColorOption } from '#blokkli/editor/types/config'
import { getColorIdAtIndex } from '../../helpers'
import { getChartTypeRuntime, getDefaultTypeOptions } from '../../chart-types'
import { colorOptions } from '#blokkli-build/editor-config'

const SINGLE_SERIES_TYPES = ['pie', 'donut', 'radialBar']

// 'advanced' is intentionally omitted — it stores raw ECharts JSON and has no
// structured data the agent can produce reliably. Editor-only feature.
export const chartTypeEnum = z.enum([
  'bar',
  'line',
  'pie',
  'area',
  'donut',
  'heatmap',
  'radialBar',
  'radar',
  'agePyramid',
])

const colorIds = Object.keys(colorOptions) as [string, ...string[]]
export const chartColorEnum = z.enum(colorIds)

export const chartSeriesSchema = z.object({
  name: z.string().describe('Series name (shown in legend)'),
  color: chartColorEnum
    .optional()
    .describe(
      'Color ID from available chart colors. Auto-assigned if omitted.',
    ),
  data: z.array(z.number()).describe('Data values, one per category'),
})

export const chartTranslationSchema = z.object({
  title: z.string().optional(),
  categories: z.array(z.string()).optional(),
  seriesNames: z.array(z.string()).optional(),
  footnotes: z.array(z.string()).optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
})

export const chartDataSchema = z.object({
  title: z.string().optional().default('').describe('Chart title'),
  type: chartTypeEnum.describe('Chart type'),
  categories: z
    .array(z.string())
    .min(1)
    .describe('Category labels (x-axis or slice names)'),
  series: z.array(chartSeriesSchema).min(1).describe('Data series'),
  categoryColors: z
    .array(chartColorEnum)
    .optional()
    .describe(
      'Color IDs per category (for pie/donut/radialBar). Auto-assigned if omitted.',
    ),
  footnotes: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      'Footnote texts. Reference in categories/series names as {1}, {2}, etc.',
    ),
  typeOptions: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional()
    .describe(
      'Type-specific rendering options. Use get_chart_type_options to see available keys.',
    ),
  translations: z
    .record(z.string(), chartTranslationSchema)
    .optional()
    .describe(
      'Per-language translations of translatable strings, keyed by langcode. Managed in the editor; agents should not modify this.',
    ),
})

/**
 * Validate and normalize chart data.
 *
 * - Checks series data length matches categories length
 * - Auto-assigns missing series colors
 * - Auto-assigns categoryColors for pie/donut/radialBar
 * - Validates color IDs exist in the provided colors map
 * - Validates typeOptions keys against the chart type definition
 * - Fills typeOptions defaults
 */
export function validateChartData(
  data: BlokkliChartData,
  options: ColorOption[],
): { error: string } | { data: BlokkliChartData } {
  const validIds = new Set(options.map((c) => c.id))
  const availableIds = options.map((c) => c.id)

  // Validate series data length matches categories.
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i]!
    if (series.data.length !== data.categories.length) {
      return {
        error: `Series "${series.name}" has ${series.data.length} data values but there are ${data.categories.length} categories. Each series must have exactly one value per category.`,
      }
    }
  }

  // Auto-assign missing series colors.
  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i]!
    if (!series.color) {
      series.color = getColorIdAtIndex(i, options)
    } else if (!validIds.has(series.color)) {
      return {
        error: `Invalid color ID "${series.color}" on series "${series.name}". Available colors: ${availableIds.join(', ')}`,
      }
    }
  }

  // Handle categoryColors for pie/donut/radialBar.
  const isSingleSeries = SINGLE_SERIES_TYPES.includes(data.type)
  if (isSingleSeries) {
    if (
      !data.categoryColors ||
      data.categoryColors.length !== data.categories.length
    ) {
      data.categoryColors = data.categories.map((_, i) =>
        getColorIdAtIndex(i, options),
      )
    } else {
      for (let i = 0; i < data.categoryColors.length; i++) {
        const id = data.categoryColors[i]!
        if (!validIds.has(id)) {
          return {
            error: `Invalid categoryColor ID "${id}" at index ${i}. Available colors: ${availableIds.join(', ')}`,
          }
        }
      }
    }
  } else if (
    !data.categoryColors ||
    data.categoryColors.length !== data.categories.length
  ) {
    data.categoryColors = data.categories.map((_, i) =>
      getColorIdAtIndex(i, options),
    )
  }

  // Validate and fill typeOptions.
  const defaults = getDefaultTypeOptions(data.type)
  const typeDef = getChartTypeRuntime(data.type)

  if (data.typeOptions && typeDef) {
    for (const key of Object.keys(data.typeOptions)) {
      if (!(key in typeDef.editor.options)) {
        const availableKeys = Object.keys(typeDef.editor.options)
        return {
          error: `Invalid typeOption "${key}" for chart type "${data.type}". Available options: ${availableKeys.join(', ')}`,
        }
      }
    }
  }

  data.typeOptions = { ...defaults, ...(data.typeOptions || {}) }

  if (!data.footnotes) {
    data.footnotes = []
  }

  return { data }
}

/**
 * Find the option key for a chart option on a block.
 *
 * Charts are stored as a JSON option with `dataType: 'chart'` on any block.
 * This helper looks up the block's definition and returns the option key.
 */
export function findChartOptionKey(
  ctx: McpToolContext,
  uuid: string,
): { key: string } | { error: string } {
  const { blocks, definitions, selection } = ctx.app
  const block = blocks.getBlock(uuid)
  if (!block) return { error: `Paragraph not found: ${uuid}` }

  const bundle = block.library?.reusableBundle || block.bundle
  const selectionItem = selection.items.value.find((v) => v.uuid === uuid)
  const definition = definitions.getBlockDefinition(
    bundle,
    selectionItem?.fieldListType ?? 'default',
    selectionItem?.parentBlockBundle ?? null,
  )
  if (!definition?.options) {
    return { error: `Paragraph "${uuid}" (${bundle}) has no chart option.` }
  }

  const chartEntry = Object.entries(definition.options).find(
    ([_, opt]) =>
      opt.type === 'json' && 'dataType' in opt && opt.dataType === 'chart',
  )
  if (!chartEntry) {
    return { error: `Paragraph "${uuid}" (${bundle}) has no chart option.` }
  }

  return { key: chartEntry[0] }
}

/**
 * Find a bundle that has a chart option among a field's allowed bundles.
 *
 * Returns the bundle name and the option key for the chart data.
 */
export function findChartBundle(
  ctx: McpToolContext,
  allowedBundles: string[],
): { bundle: string; key: string } | { error: string } {
  const { definitions } = ctx.app

  for (const bundle of allowedBundles) {
    const def = definitions.getDefaultDefinition(bundle)
    if (!def?.options) continue
    const entry = Object.entries(def.options).find(
      ([_, opt]) =>
        opt.type === 'json' && 'dataType' in opt && opt.dataType === 'chart',
    )
    if (entry) {
      return { bundle, key: entry[0] }
    }
  }

  return {
    error: `No block type with a chart option is allowed in this field.`,
  }
}
