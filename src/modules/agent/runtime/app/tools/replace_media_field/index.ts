import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID containing the media field'),
  fieldName: z.string().describe('The content field name (reference type)'),
  mediaId: z.string().describe('The media item ID (from search_media results)'),
  mediaBundle: z.string().describe('The media bundle type (e.g., "image")'),
})

export default defineBlokkliAgentTool({
  name: 'replace_media_field',
  description:
    'Replace the media on an existing block field. Use get_content_fields first to see available reference fields, then search_media to find media items.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) => $t('aiAgentReplaceMediaRunning', 'Replacing media...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['mediaLibraryReplaceMedia'],
  execute: (ctx, params) => {
    const { blocks, types, $t } = ctx.app

    // Validate block exists
    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return { error: `Block not found: ${params.uuid}` }
    }

    // Validate field exists and is a droppable media field
    const config = types.droppableFieldConfig.forName(
      ctx.itemEntityType,
      block.bundle,
      params.fieldName,
    )
    if (!config) {
      return {
        error: `Field "${params.fieldName}" is not a reference content field on ${block.bundle} blocks`,
      }
    }
    const allowedMedia = config.allowed.find((v) => v.type === 'media')
    if (!allowedMedia) {
      return {
        error: `Field "${params.fieldName}" does not accept media items`,
      }
    }
    if (!allowedMedia.bundles.includes(params.mediaBundle)) {
      return {
        error: `Field "${params.fieldName}" does not accept ${params.mediaBundle} media. Allowed: ${allowedMedia.bundles.join(', ')}`,
      }
    }

    return {
      type: 'rewrite' as const,
      label: $t('aiAgentReplaceMediaDone', 'Replaced media on @field').replace(
        '@field',
        config.label,
      ),
      apply: (adapter) =>
        adapter.mediaLibraryReplaceMedia!({
          host: {
            type: ctx.itemEntityType,
            uuid: params.uuid,
            fieldName: params.fieldName,
          },
          mediaId: params.mediaId,
        }),
      affectedUuids: [params.uuid],
    }
  },
})
