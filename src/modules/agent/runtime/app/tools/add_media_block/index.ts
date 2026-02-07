import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'
import type { DraggableMediaLibraryItem } from '#blokkli/editor/features/media-library/types'

const paramsSchema = z.object({
  mediaId: z.string().describe('Media item ID from search_media results'),
  mediaBundle: z.string().describe('Media bundle type (e.g., "image")'),
  targetBundle: z
    .string()
    .describe('Block bundle to create (from targetBundles in search_media)'),
  parent: parentSchema.describe('The parent entity to add the block to'),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'add_media_block',
  description:
    'Add a block using a media item from the library. Use search_media first to find media items, then use this tool to add one to the page. Requires user approval.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added media block' : 'rejected'),
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentAddMediaBlockRunning', 'Adding media block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['mediaLibraryAddBlock'],
  execute(ctx, params) {
    const { $t, types } = ctx.app
    const item: DraggableMediaLibraryItem = {
      itemType: 'media_library',
      mediaId: params.mediaId,
      mediaBundle: params.mediaBundle,
      itemBundles: [params.targetBundle],
      element: () => document.createElement('div'),
    }

    return {
      type: 'add' as const,
      label: $t('aiAgentAddMediaBlockDone', 'Added @bundle with media ID @id')
        .replace('@bundle', types.getBlockLabel(params.targetBundle))
        .replace('@id', params.mediaId),
      apply: (adapter) =>
        adapter.mediaLibraryAddBlock({
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          preceedingUuid: params.afterUuid ?? null,
          item,
          targetBundle: params.targetBundle,
        }),
    }
  },
})
