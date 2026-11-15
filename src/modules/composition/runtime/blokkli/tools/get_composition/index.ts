import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  findCompositionOptionKey,
  readAgentSource,
} from '../composition_helpers'

export default defineBlokkliAgentTool({
  name: 'get_composition',
  description:
    'Get the source of a composition paragraph: its markup and <style> blocks, with the texts of the paragraphs it places between their tags, in the current language. Call this before edit_composition or update_composition.',
  category: 'query',
  volatile: true,
  lazy: true,
  prunedSummary: () => 'composition source',
  modes: ['editing', 'readonly', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetCompositionRunning', 'Reading the composition', {
      more: true,
    })
  },
  paramsSchema: z.object({
    uuid: z.string().describe('UUID of the composition paragraph'),
  }),
  resultSchema: z.object({ source: z.string() }),
  async execute(ctx, params) {
    const option = findCompositionOptionKey(ctx, params.uuid)
    if ('error' in option) return option
    return {
      label: ctx.app.$t('aiAgentGetCompositionDone', 'Read the composition'),
      result: {
        source: await readAgentSource(ctx.app, params.uuid, option.key),
      },
      affectedUuids: [params.uuid],
    }
  },
})
