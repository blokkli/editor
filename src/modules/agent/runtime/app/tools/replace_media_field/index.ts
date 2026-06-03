import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'

export const paramsSchema = z.object({
  uuid: z
    .string()
    .describe('The paragraph UUID or entity UUID containing the media field'),
  field: z.string().describe('The content field name (reference type)'),
  mediaId: z.string().describe('The media item ID (from search_media results)'),
  mediaBundle: z.string().describe('The media bundle type (e.g., "image")'),
})

export const resultSchema = mutationResultSchema

export default defineBlokkliAgentTool({
  name: 'replace_media_field',
  description:
    'Replace the media on an existing paragraph field. Use get_content_fields first to see available reference fields, then search_media to find media items.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'replaced media' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentReplaceMediaRunning', 'Replacing media', { more: true })
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['mediaLibraryReplaceMedia'],
  execute(ctx, params) {
    const { blocks, types, $t, context } = ctx.app

    // Resolve entity type and bundle from either block or entity context.
    const isEntity = params.uuid === context.value.entityUuid
    const block = !isEntity ? blocks.getBlock(params.uuid) : null

    if (!isEntity && !block) {
      return { error: `Paragraph not found: ${params.uuid}` }
    }

    // Check edit permission when targeting a block
    if (block) {
      const denied = requireBundlePermission(ctx.app, [block.bundle], 'edit')
      if (denied) return denied

      // Check ancestor restrictions
      const ancestorDenied = requireNoRestrictedAncestor(ctx.app, [params.uuid])
      if (ancestorDenied) return ancestorDenied
    }

    const entityType = isEntity ? context.value.entityType : ctx.itemEntityType
    const bundle = isEntity ? context.value.entityBundle : block!.bundle

    // Validate field exists and is a droppable media field
    const config = types.droppableFieldConfig.forName(
      entityType,
      bundle,
      params.field,
    )
    if (!config) {
      return {
        error: `Field "${params.field}" is not a reference content field on ${bundle}`,
      }
    }
    const allowedMedia = config.allowed.find((v) => v.type === 'media')
    if (!allowedMedia) {
      return {
        error: `Field "${params.field}" does not accept media items`,
      }
    }
    if (!allowedMedia.bundles.includes(params.mediaBundle)) {
      return {
        error: `Field "${params.field}" does not accept ${params.mediaBundle} media. Allowed: ${allowedMedia.bundles.join(', ')}`,
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
              fieldName: params.field,
            },
            mediaId: params.mediaId,
          })
        }
        return adapter.mediaLibraryReplaceMedia!({
          host: {
            type: entityType,
            uuid: params.uuid,
            fieldName: params.field,
          },
          mediaId: params.mediaId,
        })
      },
      affectedUuids: [params.uuid],
    }
  },
})
