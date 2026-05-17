import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  advancedConfigSchema,
  findChartOptionKey,
} from '../chart_schemas'
import type { BlokkliChartData } from '#blokkli/charts/types'
import { getDefaultChartData } from '../../../helpers'

const paramsSchema = z.object({
  uuid: z.string().describe('UUID of the advanced chart paragraph'),
})

const resultSchema = z.object({
  config: advancedConfigSchema.describe(
    'The current ECharts option object stored on the chart.',
  ),
})

export default defineBlokkliAgentTool({
  name: 'get_advanced_chart_config',
  description:
    'Read the raw ECharts option object from an advanced chart. Refuses charts whose type is not "advanced"; use get_chart_data for those.',
  category: 'query',
  volatile: true,
  lazy: true,
  prunedSummary: () => 'advanced chart config',
  modes: ['readonly', 'editing', 'review'],
  label($t) {
    return $t(
      'aiAgentGetAdvancedChartConfigRunning',
      'Getting advanced chart config...',
    )
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { state, $t } = ctx.app
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
        error: `Chart "${params.uuid}" is of type "${current.type}", not "advanced". Use get_chart_data for structured chart types.`,
      }
    }

    return {
      result: {
        config: current.advancedConfig?.parsed ?? {},
      },
      label: $t(
        'aiAgentGetAdvancedChartConfigDone',
        'Got advanced chart config',
      ),
      affectedUuids: [params.uuid],
    }
  },
})
