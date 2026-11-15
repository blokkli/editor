import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '#blokkli/agent/app/tools/schemas'
import {
  prepareCompositionUpdate,
  findCompositionOptionKey,
} from '../composition_helpers'

export default defineBlokkliAgentTool({
  name: 'update_composition',
  description:
    'Replace the whole source of a composition paragraph. For a change to one part, use edit_composition instead. Keep the ids of the parts you keep: a text whose id changes loses its translations. In a translation, only the texts between the tags change.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'updated composition' : 'rejected'),
  modes: ['editing', 'translating'],
  lazy: true,
  label($t) {
    return $t('aiAgentUpdateCompositionRunning', 'Updating composition', {
      more: true,
    })
  },
  paramsSchema: z.object({
    uuid: z.string().describe('UUID of the composition paragraph'),
    source: z.string().describe('The whole new source'),
  }),
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateComposition'],
  async execute(ctx, params) {
    const option = findCompositionOptionKey(ctx, params.uuid)
    if ('error' in option) return option

    const result = await prepareCompositionUpdate(
      ctx.app,
      params.uuid,
      option.key,
      params.source,
    )
    if ('error' in result) return result

    return {
      type: 'options' as const,
      label: ctx.app.$t('aiAgentUpdateCompositionDone', 'Updated composition'),
      affectedUuids: [params.uuid],
      apply: (adapter) => adapter.updateComposition(result.event),
    }
  },
})
