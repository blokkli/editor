import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
  resolvePosition,
} from '#blokkli/agent/app/tools/schemas'
import { chartDataSchema, validateChartData } from '../chart_schemas'
import { COLORS } from '#blokkli-build/charts-config'
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
  requiredAdapterMethods: ['fragmentsAddBlock'],
  execute(ctx, params) {
    const { fields, definitions } = ctx.app

    // Check if the blokkli_chart fragment exists.
    const fragment = definitions.fragmentDefinitions.value.find(
      (f) => f.name === 'blokkli_chart',
    )
    if (!fragment) {
      return { error: 'Chart fragment "blokkli_chart" is not available.' }
    }

    // Check if the target field allows the chart fragment.
    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    if (!field.allowedFragments.includes('blokkli_chart')) {
      return {
        error: `Field "${params.parent.field}" does not allow the "blokkli_chart" fragment. Allowed fragments: ${field.allowedFragments.length ? field.allowedFragments.join(', ') : 'none'}`,
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
    const result = validateChartData(chartData, COLORS)
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

    return {
      type: 'add' as const,
      label: $t('aiAgentCreateChartDone', 'Added chart'),
      apply: (adapter) =>
        adapter.fragmentsAddBlock!({
          name: 'blokkli_chart',
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          preceedingUuid: resolved.afterUuid,
          options: { data: JSON.stringify(result.data) },
        }),
    }
  },
})
