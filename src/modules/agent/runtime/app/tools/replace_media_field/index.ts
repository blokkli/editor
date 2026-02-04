import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID containing the media field'),
  fieldName: z.string().describe('The droppable field name'),
  mediaId: z.string().describe('The media item ID (from search_media results)'),
  mediaBundle: z.string().describe('The media bundle type (e.g., "image")'),
})

export default defineBlokkliMcpTool({
  name: 'replace_media_field',
  description:
    'Replace the media on an existing block field. Use get_editable_fields first to see available droppable fields, then search_media to find media items.',
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
        error: `Field "${params.fieldName}" is not a droppable field on ${block.bundle} blocks`,
      }
    }
    if (config.allowedEntityType !== 'media') {
      return {
        error: `Field "${params.fieldName}" does not accept media items`,
      }
    }
    if (!config.allowedBundles.includes(params.mediaBundle)) {
      return {
        error: `Field "${params.fieldName}" does not accept ${params.mediaBundle} media. Allowed: ${config.allowedBundles.join(', ')}`,
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
