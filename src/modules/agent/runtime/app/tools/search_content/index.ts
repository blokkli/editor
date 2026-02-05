import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const resultSchema = z.array(
  z.object({
    id: z.string().describe('The unique ID of the content item'),
    title: z.string().describe('The display title of the content item'),
    entityType: z.string().describe('The entity type'),
    entityBundle: z.string().describe('The entity bundle'),
    targetBundles: z
      .array(z.string())
      .describe('Block bundles that can be created from this content item'),
    context: z.string().optional().describe('Additional context information'),
    text: z.string().optional().describe('Description text'),
    imageUrl: z.string().optional().describe('URL of the preview image'),
  }),
)

export default defineBlokkliAgentTool({
  resolve: async (ctx) => {
    if (
      !ctx.adapter.getContentSearchTabs ||
      !ctx.adapter.getContentSearchResults
    ) {
      return []
    }
    const tabs = await ctx.adapter.getContentSearchTabs()
    return tabs.map((tab) => {
      const typesDescription = tab.types
        .map((type) => {
          return `${type.type} (${type.bundles.join(', ')})`
        })
        .join(', ')
      const description = `Content search for these entities: ${typesDescription}`
      return defineBlokkliAgentTool({
        name: `search_content_${tab.id}`,
        description,
        category: 'query',
        requiredAdapterMethods: [
          'getContentSearchTabs',
          'getContentSearchResults',
        ],
        modes: ['readonly', 'editing', 'translating', 'review'],
        label: () => `Searching ${tab.title}...`,
        paramsSchema: z.object({
          query: z.string().describe(`Search query for ${tab.title}`),
        }),
        resultSchema,
        execute: async (toolCtx, params) => {
          const items = await toolCtx.adapter.getContentSearchResults(
            tab.id,
            params.query,
          )
          return {
            label: `Searched ${tab.title} for "${params.query}"`,
            result: items.map((item) => ({
              id: item.id,
              title: item.title,
              entityType: item.entityType,
              entityBundle: item.entityBundle,
              targetBundles: item.targetBundles,
              context: item.context,
              text: item.text,
              imageUrl: item.imageUrl,
            })),
          }
        },
      })
    })
  },
})
