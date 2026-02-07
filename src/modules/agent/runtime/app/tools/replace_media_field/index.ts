import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuid: z
    .string()
    .describe('The block UUID or entity UUID containing the media field'),
  fieldName: z.string().describe('The content field name (reference type)'),
  mediaId: z.string().describe('The media item ID (from search_media results)'),
  mediaBundle: z.string().describe('The media bundle type (e.g., "image")'),
})

export default defineBlokkliAgentTool({
  name: 'replace_media_field',
  description:
    'Replace the media on an existing block field. Use get_content_fields first to see available reference fields, then search_media to find media items.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'replaced media' : 'rejected'),
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentReplaceMediaRunning', 'Replacing media...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['mediaLibraryReplaceMedia'],
  execute(ctx, params) {
    const { blocks, types, $t, context } = ctx.app

    // Resolve entity type and bundle from either block or entity context.
    const isEntity = params.uuid === context.value.entityUuid
    const block = !isEntity ? blocks.getBlock(params.uuid) : null

    if (!isEntity && !block) {
      return { error: `Block not found: ${params.uuid}` }
    }

    const entityType = isEntity ? context.value.entityType : ctx.itemEntityType
    const bundle = isEntity ? context.value.entityBundle : block!.bundle

    // Validate field exists and is a droppable media field
    const config = types.droppableFieldConfig.forName(
      entityType,
      bundle,
      params.fieldName,
    )
    if (!config) {
      return {
        error: `Field "${params.fieldName}" is not a reference content field on ${bundle}`,
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
      apply: (adapter) => {
        if (isEntity) {
          if (!adapter.mediaLibraryReplaceEntityMedia) {
            throw new Error('Entity media replacement not supported')
          }
          return adapter.mediaLibraryReplaceEntityMedia({
            host: {
              type: entityType,
              uuid: params.uuid,
              fieldName: params.fieldName,
            },
            mediaId: params.mediaId,
          })
        }
        return adapter.mediaLibraryReplaceMedia!({
          host: {
            type: entityType,
            uuid: params.uuid,
            fieldName: params.fieldName,
          },
          mediaId: params.mediaId,
        })
      },
      affectedUuids: [params.uuid],
    }
  },
})
