import { z } from 'zod'
import type { BlokkliChartData } from '#blokkli/charts/types'
import type { McpToolContext } from '#blokkli/agent/app/types'
import type { ColorOption } from '#blokkli/editor/types/config'
import { getColorIdAtIndex } from '../../helpers'
import { getChartTypeRuntime, getDefaultTypeOptions } from '../../chart-types'
import { colorOptions } from '#blokkli-build/editor-config'
import { definitionIds } from '#blokkli-build/charts-definitions'

// All registered chart types except `advanced` — `advanced` stores raw ECharts
// JSON and has no structured data the agent can produce reliably.
const agentChartTypeIds = definitionIds.filter((id) => id !== 'advanced') as [
  string,
  ...string[],
]
export const chartTypeEnum = z.enum(agentChartTypeIds)

// Build the union of all referenceable color ids at build time: every base
// id, plus `<base>.<shade>` for ramped colors. Runtime disabling (via
// app.config null-override) is enforced inside `validateChartData`; the agent's
// schema necessarily reflects the build-time universe because tool schemas are
// extracted statically at build time.
const colorIds = Object.entries(colorOptions).flatMap(([id, option]) => {
  if ('shades' in option) {
    return [id, ...Object.keys(option.shades).map((shade) => `${id}.${shade}`)]
  }
  return [id]
}) as [string, ...string[]]
export const chartColorEnum = z.enum(colorIds)

function parseColorId(id: string): {
  baseId: string
  shadeId: string | undefined
} {
  const dotIndex = id.indexOf('.')
  if (dotIndex === -1) return { baseId: id, shadeId: undefined }
  return { baseId: id.slice(0, dotIndex), shadeId: id.slice(dotIndex + 1) }
}

function isColorEnabled(id: string, options: ColorOption[]): boolean {
  const { baseId, shadeId } = parseColorId(id)
  const option = options.find((c) => c.id === baseId)
  if (!option) return false
  if (shadeId === undefined) return true
  return option.shades?.some((s) => s.id === shadeId) === true
}

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

export const numberFormatSchema = z.object({
  locale: z
    .string()
    .optional()
    .describe("BCP-47 locale tag (e.g. 'de-CH', 'en-US'). Empty = default."),
  decimals: z
    .number()
    .int()
    .min(0)
    .max(4)
    .optional()
    .describe('Forced fraction digits 0-4. Omit to let Intl decide.'),
  prefix: z
    .string()
    .optional()
    .describe("String before the number (e.g. 'CHF ')."),
  suffix: z
    .string()
    .optional()
    .describe("String after the number (e.g. ' kg', '%')."),
  notation: z
    .enum(['standard', 'compact'])
    .optional()
    .describe("'standard' for full numbers, 'compact' for short form (1.2M)."),
})

export const dateFormatSchema = z.object({
  style: z
    .enum([
      'auto',
      'none',
      'monthYearShort',
      'monthYearLong',
      'monthOnly',
      'monthYearNumeric',
      'iso',
      'dateShort',
      'dateLong',
      'yearOnly',
    ])
    .optional()
    .describe(
      'Display style applied to category labels when they look like dates. Falls back to `auto`. Locale is reused from `numberFormat.locale`.',
    ),
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
      'Color IDs per category. Only used by chart types with per-category colors (pie, donut, radialBar). Auto-assigned if omitted.',
    ),
  footnotes: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      'Footnote texts. Reference in categories/series names as {1}, {2}, etc.',
    ),
  typeOptions: z
    .record(
      z.string(),
      z.union([z.string(), z.boolean(), z.number(), z.null()]),
    )
    .optional()
    .describe(
      'Type-specific rendering options. Use get_chart_type_options to see available keys. Pass `null` to clear a nullable option (e.g. `yaxisMin`).',
    ),
  numberFormat: numberFormatSchema
    .optional()
    .describe(
      'Number formatting for axes, data labels and tooltips. Locale, decimals, prefix/suffix and notation.',
    ),
  dateFormat: dateFormatSchema
    .optional()
    .describe(
      'How to format category labels detected as dates. Locale is reused from numberFormat.locale.',
    ),
  translations: z
    .record(z.string(), chartTranslationSchema)
    .optional()
    .describe(
      'Per-language translations of translatable strings, keyed by langcode. Managed in the editor; agents should not modify this.',
    ),
})

export const advancedConfigSchema = z
  .record(z.string(), z.unknown())
  .describe(
    'Raw ECharts option object — same shape ECharts.setOption() accepts. Pass the structured object; no JSON-stringify needed.',
  )

/**
 * Structural validation for an `advanced` chart's ECharts config. ECharts
 * itself ships no validator and is permissive at runtime, so this mirrors
 * the editor's textarea check: non-null object, not an array, non-empty.
 */
export function validateAdvancedConfig(
  value: unknown,
): { error: string } | { value: Record<string, unknown> } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      error: 'Configuration must be a non-null JSON object, not an array.',
    }
  }
  if (Object.keys(value as Record<string, unknown>).length === 0) {
    return {
      error:
        'Configuration is empty. Provide at least a `series` (or similar) top-level key.',
    }
  }
  return { value: value as Record<string, unknown> }
}

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
  const availableIds = options.flatMap((c) => [
    c.id,
    ...(c.shades?.map((s) => `${c.id}.${s.id}`) ?? []),
  ])

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
    } else if (!isColorEnabled(series.color, options)) {
      return {
        error: `Invalid color ID "${series.color}" on series "${series.name}". Available colors: ${availableIds.join(', ')}`,
      }
    }
  }

  // Handle categoryColors only for chart types that actually use them.
  const typeDef = getChartTypeRuntime(data.type)
  if (typeDef?.hasCategoryColors) {
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
        if (!isColorEnabled(id, options)) {
          return {
            error: `Invalid categoryColor ID "${id}" at index ${i}. Available colors: ${availableIds.join(', ')}`,
          }
        }
      }
    }
  }

  // Validate and fill typeOptions.
  const defaults = getDefaultTypeOptions(data.type)

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
