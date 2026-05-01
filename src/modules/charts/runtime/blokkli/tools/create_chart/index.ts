import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
} from '#blokkli/agent/app/tools/schemas'
import { resolvePosition } from '#blokkli/agent/app/tools/helpers'
import {
  chartDataSchema,
  validateChartData,
  findChartBundle,
} from '../chart_schemas'
import type { BlokkliChartData } from '#blokkli/charts/types'

const paramsSchema = z.object({
  chart: chartDataSchema,
  parent: parentSchema.describe('The parent entity to add the chart to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'create_chart',
  description:
    'Create a new chart on the page. Series colors are auto-assigned if omitted. For pie/donut/radialBar charts, only the first series is used and each category gets its own color (auto-assigned if categoryColors is omitted). Use get_chart_type_options to discover available typeOptions for the chosen chart type before setting them.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'created chart' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentCreateChartRunning', 'Creating chart...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addNewBlocks'],
  execute(ctx, params) {
    const { fields } = ctx.app

    // Check if the target field exists.
    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    // Find a bundle that has a chart option among the field's allowed bundles.
    const chartBundle = findChartBundle(ctx, field.allowedBundles)
    if ('error' in chartBundle) {
      return {
        error: `No block type with a chart option is allowed in field "${params.parent.field}". Allowed bundles: ${field.allowedBundles.length ? field.allowedBundles.join(', ') : 'none'}`,
      }
    }

    // Build chart data from params.
    const chartData: BlokkliChartData = {
      title: params.chart.title,
      type: params.chart.type,
      categories: params.chart.categories,
      series: params.chart.series.map((s) => ({
        name: s.name,
        color: s.color || '',
        data: s.data,
      })),
      categoryColors: params.chart.categoryColors || [],
      footnotes: params.chart.footnotes,
      typeOptions: params.chart.typeOptions || {},
    }

    // Validate and normalize.
    const result = validateChartData(
      chartData,
      ctx.app.config.colorOptions.value,
    )
    if ('error' in result) return result

    // Resolve position.
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

    const { $t } = ctx.app
    const blockUuid = crypto.randomUUID()

    return {
      type: 'add' as const,
      label: $t('aiAgentCreateChartDone', 'Added chart'),
      apply: (adapter) =>
        adapter.addNewBlocks({
          blocks: [
            {
              bundle: chartBundle.bundle,
              blockUuid,
              options: {
                [chartBundle.key]: JSON.stringify(result.data),
              },
            },
          ],
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: resolved.afterUuid,
        }),
    }
  },
})
