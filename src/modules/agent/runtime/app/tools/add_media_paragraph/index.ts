import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition } from '../helpers'
import { requireBundlePermission } from '../../helpers/validation'
import type { DraggableMediaLibraryItem } from '#blokkli/editor/features/media-library/types'

const paramsSchema = z.object({
  mediaId: z.string().describe('Media item ID from search_media results'),
  mediaBundle: z.string().describe('Media bundle type (e.g., "image")'),
  targetBundle: z
    .string()
    .describe(
      'Paragraph bundle to create (from targetBundles in search_media)',
    ),
  parent: parentSchema.describe('The parent entity to add the paragraph to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'add_media_paragraph',
  description:
    'Add a paragraph using a media item from the library. Use search_media first to find media items, then use this tool to add one to the page. Requires user approval.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added media paragraph' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentAddMediaBlockRunning', 'Adding media block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['mediaLibraryAddBlock'],
  execute(ctx, params) {
    // Check add permission for the target bundle
    const denied = requireBundlePermission(
      ctx.app,
      [params.targetBundle],
      'add',
    )
    if (denied) return denied

    // Check ancestor restrictions on the target parent
    if (ctx.app.permissions.blockHasRestrictedAncestor(params.parent.uuid)) {
      return {
        error:
          'Permission denied: target parent is inside a block with restricted editing permissions',
      }
    }

    const { $t, types } = ctx.app
    const item: DraggableMediaLibraryItem = {
      itemType: 'media_library',
      mediaId: params.mediaId,
      mediaBundle: params.mediaBundle,
      itemBundles: [params.targetBundle],
      element: () => document.createElement('div'),
    }

    // Resolve position to afterUuid
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

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
          preceedingUuid: resolved.afterUuid,
          item,
          targetBundle: params.targetBundle,
        }),
    }
  },
})
