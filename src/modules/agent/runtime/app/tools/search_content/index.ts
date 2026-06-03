import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

export const paramsSchema = z.object({
  tab: z
    .string()
    .describe(
      'The tab ID to search in. See the system prompt for available tab IDs.',
    ),
  query: z.string().describe('The search query'),
})

export const resultSchema = z.array(
  z.object({
    id: z.string().describe('The unique ID of the content item'),
    title: z.string().describe('The display title of the content item'),
    entityType: z.string().describe('The entity type'),
    entityBundle: z.string().describe('The entity bundle'),
    targetBundles: z
      .array(z.string())
      .describe('Paragraph bundles that can be created from this content item'),
    context: z.string().optional().describe('Additional context information'),
    text: z.string().optional().describe('Description text'),
    imageUrl: z.string().optional().describe('URL of the preview image'),
  }),
)

export default defineBlokkliAgentTool({
  name: 'search_content',
  description:
    'Search for content items by tab ID and query. The available tab IDs and their entity types are listed in the system prompt under "Content Search Tabs". Use the tab ID that matches the type of content you are looking for.',
  category: 'query',
  lazy: true,
  requiredAdapterMethods: ['getContentSearchTabs', 'getContentSearchResults'],
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentSearchContentRunning', 'Searching content', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const tabs = await ctx.adapter.getContentSearchTabs()
    const tab = tabs.find((t) => t.id === params.tab)
    if (!tab) {
      return {
        error: `Invalid tab ID "${params.tab}". Available tabs: ${tabs.map((t) => t.id).join(', ')}`,
      }
    }

    const items = await ctx.adapter.getContentSearchResults(
      params.tab,
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
