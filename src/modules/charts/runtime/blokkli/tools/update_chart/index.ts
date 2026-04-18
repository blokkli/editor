import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '#blokkli/agent/app/tools/schemas'
import {
  chartTypeEnum,
  chartColorEnum,
  chartSeriesSchema,
  validateChartData,
  findChartOptionKey,
} from '../chart_schemas'
import { COLORS } from '#blokkli-build/charts-config'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the chart paragraph to update'),
  title: z.string().optional().describe('Chart title'),
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
      'Color IDs per category (for pie/donut/radialBar). Auto-assigned if omitted.',
    ),
  footnotes: z
    .array(z.string())
    .optional()
    .describe(
      'Footnote texts. Reference in categories/series names as {1}, {2}, etc.',
    ),
  typeOptions: z
    .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
    .optional()
    .describe(
      'Type-specific rendering options. Use get_chart_type_options to see available keys.',
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
    return $t('aiAgentUpdateChartRunning', 'Updating chart...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateOptions'],
  execute(ctx, params) {
    const { state } = ctx.app

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
        current = getDefaultChartData(COLORS)
      }
    } else {
      current = getDefaultChartData(COLORS)
    }

    // Merge updates (top-level replace for provided fields).
    const merged = {
      title: params.title !== undefined ? params.title : current.title,
      type: params.type !== undefined ? params.type : current.type,
      categories:
        params.categories !== undefined
          ? params.categories
          : current.categories,
      series:
        params.series !== undefined
          ? params.series.map((s) => ({
              name: s.name,
              color: s.color || '',
              data: s.data,
            }))
          : current.series,
      categoryColors:
        params.categoryColors !== undefined
          ? params.categoryColors
          : current.categoryColors,
      footnotes:
        params.footnotes !== undefined ? params.footnotes : current.footnotes,
      typeOptions:
        params.typeOptions !== undefined
          ? params.typeOptions
          : current.typeOptions || {},
    } as BlokkliChartData

    // Validate and normalize.
    const result = validateChartData(merged, COLORS)
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
