import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
} from '#blokkli/agent/app/tools/schemas'
import { resolvePosition } from '#blokkli/agent/app/tools/helpers'
import {
  advancedConfigSchema,
  validateAdvancedConfig,
  findChartBundle,
} from '../chart_schemas'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  config: advancedConfigSchema,
  parent: parentSchema.describe('The parent entity to add the chart to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'create_advanced_chart',
  description:
    'Create a new advanced chart that renders a raw ECharts option object. Use this only when the user needs a chart type or layout not covered by the structured chart types (bar, line, pie, area, donut, heatmap, radialBar, radar, agePyramid). For those, use create_chart instead.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'created advanced chart' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t(
      'aiAgentCreateAdvancedChartRunning',
      'Creating advanced chart...',
    )
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addNewBlocks'],
  execute(ctx, params) {
    const { fields } = ctx.app

    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    const chartBundle = findChartBundle(ctx, field.allowedBundles)
    if ('error' in chartBundle) {
      return {
        error: `No block type with a chart option is allowed in field "${params.parent.field}". Allowed bundles: ${field.allowedBundles.length ? field.allowedBundles.join(', ') : 'none'}`,
      }
    }

    const validated = validateAdvancedConfig(params.config)
    if ('error' in validated) return validated

    // Start from a structured default so required fields (categories, series,
    // categoryColors) are present — they're ignored at render for advanced
    // charts but the type requires them.
    const base = getDefaultChartData(ctx.app.config.colorOptions.value)
    const chartData: BlokkliChartData = {
      ...base,
      type: 'advanced',
      advancedConfig: { parsed: validated.value },
    }

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
      label: $t('aiAgentCreateAdvancedChartDone', 'Added advanced chart'),
      apply: (adapter) =>
        adapter.addNewBlocks({
          blocks: [
            {
              bundle: chartBundle.bundle,
              blockUuid,
              options: {
                [chartBundle.key]: JSON.stringify(chartData),
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
