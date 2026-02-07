import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  query: z.string().optional().describe('Search text to filter templates'),
})

const templateSchema = z.object({
  uuid: z.string().describe('The unique UUID of the template'),
  label: z.string().describe('The display label'),
  description: z
    .string()
    .optional()
    .describe('A short description of the template'),
  itemBundles: z
    .array(z.string())
    .describe('Block types contained in the template'),
})

const resultSchema = z.object({
  templates: z.array(templateSchema).describe('Matching templates'),
  total: z.number().describe('Total number of matching templates'),
})

export default defineBlokkliAgentTool({
  name: 'search_templates',
  description:
    'Search for available templates. Templates are reusable block collections created by users that can be added to the page.',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentSearchTemplatesRunning', 'Searching templates...')
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['templatesSearch'],
  async execute(ctx, params) {
    const { $t } = ctx.app

    const apiResult = await ctx.adapter.templatesSearch!({
      filters: params.query ? { text: params.query } : {},
      page: 0,
      includeItems: false,
    })

    const result = {
      templates: apiResult.items.map((item) => ({
        uuid: item.uuid,
        label: item.label,
        description: item.description,
        itemBundles: item.itemBundles,
      })),
      total: apiResult.total,
    }

    const label = params.query
      ? $t(
          'aiAgentSearchTemplatesDone',
          "Searched templates for '@query'",
        ).replace('@query', params.query)
      : $t('aiAgentSearchTemplatesAllDone', 'Searched all templates')

    return { label, result }
  },
})
