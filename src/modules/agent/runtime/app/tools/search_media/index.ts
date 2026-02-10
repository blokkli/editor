import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      'Search text to filter media items. Omit or leave empty to list all available media.',
    ),
  bundle: z
    .string()
    .optional()
    .describe('Media bundle filter (e.g., "image", "video")'),
})

const resultSchema = z.object({
  items: z.array(
    z.object({
      mediaId: z.string().describe('The unique ID of the media item'),
      label: z.string().describe('The display label/title of the media'),
      mediaBundle: z
        .string()
        .describe('The media type (e.g., "image", "video")'),
      thumbnail: z.string().optional().describe('URL of the thumbnail image'),
      targetBundles: z
        .array(z.string())
        .describe('Block bundles that can be created from this media'),
    }),
  ),
  total: z.number().describe('Total number of matching media items'),
})

export type SearchMediaResult = z.infer<typeof resultSchema>

export default defineBlokkliAgentTool({
  name: 'search_media',
  description:
    'Search the media library for images, videos, and other media. Returns media items that can be added to the page using add_media_block. If more than one matching media is found: USE THE select_media TOOL TO LET THE USER PICK.',
  category: 'query',
  prunedSummary: (r) => `found ${r.total || 0} media items`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentSearchMediaRunning', 'Searching media...')
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['mediaLibraryGetResults'],
  async execute(ctx, params) {
    const { $t } = ctx.app
    const filters: Record<string, string> = {}
    const query = (params.query ?? '').replaceAll('*', '').replaceAll('%', '')
    if (query) filters.text = query
    if (params.bundle) filters.bundle = params.bundle

    const apiResult = await ctx.adapter.mediaLibraryGetResults!({
      filters,
      page: 0,
    })

    const result = {
      items: apiResult.items.map((item) => ({
        mediaId: item.mediaId,
        label: item.label,
        mediaBundle: item.mediaBundle || '',
        thumbnail: item.thumbnail,
        targetBundles: item.targetBundles,
      })),
      total: apiResult.total,
    }

    const label = query
      ? $t('aiAgentSearchMediaDone', "Searched media for '@query'").replace(
          '@query',
          query,
        )
      : $t('aiAgentSearchMediaAllDone', 'Searched all media')

    return { label, result }
  },
})
