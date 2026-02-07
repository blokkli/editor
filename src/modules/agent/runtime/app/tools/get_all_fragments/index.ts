import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const fragmentSchema = z.object({
  name: z.string().describe('The unique fragment identifier'),
  label: z.string().describe('The display label'),
  description: z
    .string()
    .optional()
    .describe('A short description of the fragment'),
})

const paramsSchema = z.object({})

const resultSchema = z.array(fragmentSchema).describe('All available fragments')

export default defineBlokkliAgentTool({
  name: 'get_all_fragments',
  description: 'Get all available fragments that can be added to the page',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetAllFragments', 'Get all fragments')
  },
  paramsSchema,
  resultSchema,
  execute(ctx) {
    const { definitions, $t } = ctx.app

    const result = definitions.fragmentDefinitions.value.map((fragment) => ({
      name: fragment.name,
      label: fragment.label,
      description: fragment.description,
    }))

    return {
      label: $t('aiAgentGetAllFragmentsDone', 'Got all fragments'),
      result,
    }
  },
})
