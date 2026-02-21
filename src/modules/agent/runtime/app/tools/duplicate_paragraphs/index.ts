import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition } from '../helpers'
import {
  validateBlocksExist,
  validateSameField,
  validateFieldCardinality,
  validateBundlesAllowed,
} from '../../helpers/validation'
import { getFieldKey } from '#blokkli/helpers'
import { itemEntityType } from '#blokkli-build/config'

const paramsSchema = z.object({
  uuids: z.array(z.string()).min(1).describe('Paragraph UUIDs to duplicate'),
  parent: parentSchema
    .optional()
    .describe('Target parent field. If omitted, duplicates in same field.'),
  position: positionSchema.describe(
    'Where to place the duplicated paragraphs (only when parent is provided). Defaults to "end".',
  ),
})

export default defineBlokkliAgentTool({
  name: 'duplicate_paragraphs',
  description:
    'Duplicate one or more paragraphs, with ALL their child paragraphs. Without parent parameter, duplicates in the same field. With parent parameter, duplicates to a different field.',
  category: 'mutation',
  prunedSummary: (r) =>
    r.success
      ? `duplicated ${r.newParagraphs?.length || 0} paragraphs`
      : 'rejected',
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentDuplicateBlocksRunning', 'Duplicating blocks...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['duplicateBlocks'],
  execute(ctx, params) {
    const { $t, types, context, blocks } = ctx.app

    // 1. Validate all blocks exist
    const blocksResult = validateBlocksExist(ctx.app, params.uuids)
    if ('error' in blocksResult) return blocksResult

    // If parent is provided, duplicate to a different field
    if (params.parent) {
      // Check if adapter supports pasteExistingBlocks
      if (!ctx.adapter.pasteExistingBlocks) {
        return {
          error:
            'Duplicating to another field is not supported by this adapter',
        }
      }

      // Determine if target parent is the root entity or a block
      const isRootEntity = params.parent.uuid === context.value.entityUuid
      const entityType = isRootEntity
        ? context.value.entityType
        : itemEntityType
      const targetBundle = isRootEntity
        ? context.value.entityBundle
        : blocks.getBlock(params.parent.uuid)?.bundle

      if (!targetBundle) {
        return { error: 'Target parent not found.' }
      }

      // Validate target field exists
      const fieldConfig = types.getFieldConfig(
        entityType,
        targetBundle,
        params.parent.field,
      )
      if (!fieldConfig) {
        return {
          error: `Field "${params.parent.field}" not found on target parent.`,
        }
      }

      // Validate bundles are allowed in target field
      const bundles = blocksResult.blocks.map((b) => b.bundle)
      if (fieldConfig.allowedBundles.length) {
        const disallowed = bundles.filter(
          (b) => !fieldConfig.allowedBundles.includes(b),
        )
        if (disallowed.length > 0) {
          return {
            error: `Bundle(s) "${disallowed.join(', ')}" not allowed in field "${params.parent.field}". Allowed: ${fieldConfig.allowedBundles.join(', ')}`,
          }
        }
      }

      // Validate cardinality
      const fieldKey = getFieldKey(params.parent.uuid, params.parent.field)
      if (fieldConfig.cardinality !== -1) {
        const currentCount = ctx.app.state.getFieldBlockCount(fieldKey)
        if (currentCount + params.uuids.length > fieldConfig.cardinality) {
          return {
            error: `Field "${params.parent.field}" can only hold ${fieldConfig.cardinality} paragraphs (currently has ${currentCount}, trying to add ${params.uuids.length})`,
          }
        }
      }

      // Create label
      const label =
        params.uuids.length === 1
          ? $t(
              'aiAgentDuplicateBlockToFieldDone',
              'Duplicated @bundle to @field',
            )
              .replace(
                '@bundle',
                types.getBlockLabel(blocksResult.blocks[0]!.bundle),
              )
              .replace('@field', params.parent.field)
          : $t(
              'aiAgentDuplicateBlocksToFieldDone',
              'Duplicated @count blocks to @field',
            )
              .replace('@count', String(params.uuids.length))
              .replace('@field', params.parent.field)

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
        label,
        apply: (adapter) =>
          adapter.pasteExistingBlocks!({
            uuids: params.uuids,
            host: {
              type: params.parent!.type,
              uuid: params.parent!.uuid,
              fieldName: params.parent!.field,
            },
            preceedingUuid: resolved.afterUuid,
          }),
      }
    }

    // Original behavior: duplicate in same field
    // 2. Validate all blocks are in the same field
    const fieldResult = validateSameField(blocksResult.blocks)
    if ('error' in fieldResult) return fieldResult

    // 3. Validate cardinality allows duplication
    const cardinalityResult = validateFieldCardinality(
      ctx.app,
      fieldResult.host,
      fieldResult.fieldKey,
      params.uuids.length,
    )
    if (!cardinalityResult.valid) return { error: cardinalityResult.error }

    // 4. Validate bundles are still allowed
    const bundles = blocksResult.blocks.map((b) => b.bundle)
    const bundlesResult = validateBundlesAllowed(
      ctx.app,
      fieldResult.host,
      bundles,
    )
    if (!bundlesResult.valid) return { error: bundlesResult.error }

    // Create label
    const label =
      params.uuids.length === 1
        ? $t('aiAgentDuplicateBlockDone', 'Duplicated @bundle').replace(
            '@bundle',
            types.getBlockLabel(blocksResult.blocks[0]!.bundle),
          )
        : $t('aiAgentDuplicateBlocksDone', 'Duplicated @count blocks').replace(
            '@count',
            String(params.uuids.length),
          )

    return {
      type: 'add' as const, // duplicating adds blocks
      label,
      apply: (adapter) => adapter.duplicateBlocks(params.uuids),
    }
  },
})
