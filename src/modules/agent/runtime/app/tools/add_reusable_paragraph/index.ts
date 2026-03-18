import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition } from '../helpers'
import { requireBundlePermission } from '../../helpers/validation'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'

const paramsSchema = z.object({
  libraryItemUuid: z
    .string()
    .describe(
      'The UUID of the reusable paragraph to add (from search_reusable_paragraphs results)',
    ),
  parent: parentSchema.describe(
    'The parent entity to add the reusable paragraph to.',
  ),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'add_reusable_paragraph',
  description:
    'Add a reusable paragraph to the page. Reusable paragraphs stay linked to the original: edits to the paragraph are reflected everywhere it is used. Use search_reusable_paragraphs first to find available paragraphs.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added reusable paragraph' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentAddLibraryItemRunning', 'Adding reusable block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addLibraryItem'],
  execute(ctx, params) {
    // Check add permission for from_library bundle
    const denied = requireBundlePermission(
      ctx.app,
      [fromLibraryBlockBundle],
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

    const { types, fields, context, blocks, $t } = ctx.app

    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    // Resolve field config to check allowed bundles.
    const isRootEntity = params.parent.uuid === context.value.entityUuid
    const parentEntityType = isRootEntity
      ? context.value.entityType
      : itemEntityType
    const parentBundle = isRootEntity
      ? context.value.entityBundle
      : blocks.getBlock(params.parent.uuid)?.bundle

    if (parentBundle) {
      const fieldConfig = types.getFieldConfig(
        parentEntityType,
        parentBundle,
        params.parent.field,
      )

      if (
        fieldConfig?.allowedBundles.length &&
        !fieldConfig.allowedBundles.includes(fromLibraryBlockBundle)
      ) {
        return {
          error: `Field "${params.parent.field}" does not allow from_library bundles.`,
        }
      }
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
      label: $t('aiAgentAddLibraryItemDone', 'Added reusable block'),
      apply: (adapter) =>
        adapter.addLibraryItem!({
          libraryItemUuid: params.libraryItemUuid,
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: resolved.afterUuid,
        }),
    }
  },
})
