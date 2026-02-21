import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { blockOptionsMapSchema } from '#blokkli/agent/app/tools/schemas'
import { buildBlockOptionsMapFromDefinitions } from '#blokkli/agent/app/tools/helpers'
import { getChartTypeRuntime } from '../../../chartTypes'
import { chartTypeEnum } from '../chart_schemas'

const paramsSchema = z.object({
  type: chartTypeEnum.describe('The chart type to get options for'),
})

const resultSchema = z.object({
  type: z.string().describe('The chart type ID'),
  options: blockOptionsMapSchema.describe('Available typeOptions'),
})

export default defineBlokkliAgentTool({
  name: 'get_chart_type_options',
  description:
    'Get available typeOptions for a chart type. Call this before setting typeOptions on create_chart or update_chart to know which keys are valid, their types, defaults, and allowed values.',
  category: 'query',
  volatile: true,
  lazy: true,
  prunedSummary: (r) => `options for ${r.type}`,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentGetChartTypeOptionsRunning', 'Getting chart options...')
  },
  paramsSchema,
  resultSchema,
  execute(_ctx, params) {
    const def = getChartTypeRuntime(params.type)
    if (!def) {
      return { error: `Unknown chart type: ${params.type}` }
    }

    return {
      result: {
        type: params.type,
        options: buildBlockOptionsMapFromDefinitions(def.editor.options),
      },
      label: `Chart options for "${def.editor.label}"`,
    }
  },
})
