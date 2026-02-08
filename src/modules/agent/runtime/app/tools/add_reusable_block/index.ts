import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'

const paramsSchema = z.object({
  libraryItemUuid: z
    .string()
    .describe(
      'The UUID of the reusable block to add (from search_reusable_blocks results)',
    ),
  parent: parentSchema.describe(
    'The parent entity to add the reusable block to.',
  ),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'add_reusable_block',
  description:
    'Add a reusable block to the page. Reusable blocks stay linked to the original: edits to the block are reflected everywhere it is used. Use search_reusable_blocks first to find available blocks.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added reusable block' : 'rejected'),
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentAddLibraryItemRunning', 'Adding reusable block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addLibraryItem'],
  execute(ctx, params) {
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
          afterUuid: params.afterUuid ?? null,
        }),
    }
  },
})
