import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '#blokkli/agent/app/tools/schemas'
import {
  chartTypeEnum,
  chartColorEnum,
  chartSeriesSchema,
  validateChartData,
  findChartOptionKey,
  numberFormatSchema,
  dateFormatSchema,
} from '../chart_schemas'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the chart paragraph to update'),
  title: z.string().optional().describe('Chart title'),
  valueAxisTitle: z
    .string()
    .optional()
    .describe(
      'Title of the value axis (numeric scale), e.g. "Number of apartments". Only rendered by cartesian types (bar, line, area, agePyramid).',
    ),
  categoryAxisTitle: z
    .string()
    .optional()
    .describe(
      'Title of the category axis (the labels), e.g. "Year". Only rendered by cartesian types (bar, line, area, agePyramid).',
    ),
  type: chartTypeEnum.optional().describe('Chart type'),
  categories: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      'Category labels (x-axis or slice names). Replaces all existing categories.',
    ),
  series: z
    .array(chartSeriesSchema)
    .min(1)
    .optional()
    .describe('Data series. Replaces all existing series.'),
  categoryColors: z
    .array(chartColorEnum)
    .optional()
    .describe(
      'Color IDs per category. Only used by chart types with per-category colors (pie, donut, radialBar). Auto-assigned if omitted.',
    ),
  footnotes: z
    .array(z.string())
    .optional()
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
      'Number formatting for axes, data labels and tooltips. Replaces the existing numberFormat.',
    ),
  dateFormat: dateFormatSchema
    .optional()
    .describe(
      'How to format category labels detected as dates. Replaces the existing dateFormat.',
    ),
})

export default defineBlokkliAgentTool({
  name: 'update_chart',
  description:
    'Update an existing chart. Provide only the properties you want to change — they will be merged with the current chart data. Arrays (series, categories, footnotes) are replaced entirely when provided, not merged element-by-element.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'updated chart' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentUpdateChartRunning', 'Updating chart', { more: true })
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateOptions'],
  execute(ctx, params) {
    const { state } = ctx.app
    const options = ctx.app.config.colorOptions.value

    // Find the chart option key on this block.
    const chartOption = findChartOptionKey(ctx, params.uuid)
    if ('error' in chartOption) return chartOption

    // Read current chart data from options.
    let current: BlokkliChartData
    const item = state.getFieldListItem(params.uuid)
    const rawData =
      state.mutatedOptions[params.uuid]?.[chartOption.key] ||
      item?.options?.[chartOption.key]
    if (rawData) {
      try {
        current = JSON.parse(rawData)
      } catch {
        current = getDefaultChartData(options)
      }
    } else {
      current = getDefaultChartData(options)
    }

    // Charts with a dynamic data source ignore inline categories/series at
    // render time — refuse to silently overwrite them. Other fields (title,
    // type, typeOptions, footnotes, formatting) remain editable.
    if (current.dataSource) {
      if (params.categories !== undefined || params.series !== undefined) {
        return {
          error: `Chart "${params.uuid}" is bound to dynamic data source "${current.dataSource.label || current.dataSource.id}". Inline categories and series are ignored at render time. To change the data, unbind the data source in the editor first.`,
        }
      }
    }

    // Spread `current` first so unknown-to-agent fields (`dataSource`,
    // `translations`, `advancedConfig`, future fields) are preserved; then
    // overlay only what the caller supplied.
    const merged: BlokkliChartData = {
      ...current,
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.valueAxisTitle !== undefined
        ? { valueAxisTitle: params.valueAxisTitle }
        : {}),
      ...(params.categoryAxisTitle !== undefined
        ? { categoryAxisTitle: params.categoryAxisTitle }
        : {}),
      ...(params.type !== undefined ? { type: params.type } : {}),
      ...(params.categories !== undefined
        ? { categories: params.categories }
        : {}),
      ...(params.series !== undefined
        ? {
            series: params.series.map((s) => ({
              name: s.name,
              color: s.color || '',
              data: s.data,
            })),
          }
        : {}),
      ...(params.categoryColors !== undefined
        ? { categoryColors: params.categoryColors }
        : {}),
      ...(params.footnotes !== undefined
        ? { footnotes: params.footnotes }
        : {}),
      ...(params.typeOptions !== undefined
        ? { typeOptions: params.typeOptions }
        : {}),
      ...(params.numberFormat !== undefined
        ? { numberFormat: params.numberFormat }
        : {}),
      ...(params.dateFormat !== undefined
        ? { dateFormat: params.dateFormat }
        : {}),
    }

    // Validate and normalize.
    const result = validateChartData(merged, options)
    if ('error' in result) return result

    const { $t } = ctx.app

    return {
      type: 'options' as const,
      label: $t('aiAgentUpdateChartDone', 'Updated chart'),
      affectedUuids: [params.uuid],
      apply: (adapter) =>
        adapter.updateOptions([
          {
            uuid: params.uuid,
            key: chartOption.key,
            value: JSON.stringify(result.data),
          },
        ]),
    }
  },
})
