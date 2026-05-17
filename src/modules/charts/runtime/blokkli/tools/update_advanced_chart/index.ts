import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '#blokkli/agent/app/tools/schemas'
import {
  advancedConfigSchema,
  validateAdvancedConfig,
  findChartOptionKey,
} from '../chart_schemas'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the advanced chart paragraph to update'),
  config: advancedConfigSchema.describe(
    'Full replacement ECharts option object. The previous config is overwritten.',
  ),
})

export default defineBlokkliAgentTool({
  name: 'update_advanced_chart',
  description:
    'Replace the ECharts option object on an existing advanced chart. The config is a full replacement, not a partial merge — call get_advanced_chart_config first if you need to read-then-edit. Refuses charts whose type is not "advanced"; use update_chart for those.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'updated advanced chart' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t(
      'aiAgentUpdateAdvancedChartRunning',
      'Updating advanced chart...',
    )
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateOptions'],
  execute(ctx, params) {
    const { state } = ctx.app
    const options = ctx.app.config.colorOptions.value

    const chartOption = findChartOptionKey(ctx, params.uuid)
    if ('error' in chartOption) return chartOption

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

    if (current.type !== 'advanced') {
      return {
        error: `Chart "${params.uuid}" is of type "${current.type}", not "advanced". Use update_chart for structured chart types.`,
      }
    }

    const validated = validateAdvancedConfig(params.config)
    if ('error' in validated) return validated

    // Spread-then-overlay so any other top-level fields (translations,
    // inline data snapshots, etc.) survive the update.
    const merged: BlokkliChartData = {
      ...current,
      advancedConfig: { parsed: validated.value },
    }

    const { $t } = ctx.app

    return {
      type: 'options' as const,
      label: $t('aiAgentUpdateAdvancedChartDone', 'Updated advanced chart'),
      affectedUuids: [params.uuid],
      apply: (adapter) =>
        adapter.updateOptions([
          {
            uuid: params.uuid,
            key: chartOption.key,
            value: JSON.stringify(merged),
          },
        ]),
    }
  },
})
