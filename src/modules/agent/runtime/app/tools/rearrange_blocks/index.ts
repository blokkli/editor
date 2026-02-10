import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'
import { itemEntityType } from '#blokkli-build/config'

const paramsSchema = z.object({
  parent: parentSchema.describe('The parent field containing the blocks'),
  uuids: z
    .array(z.string())
    .min(2)
    .describe(
      'The UUIDs of the blocks in the desired order. Must include ALL blocks currently in the field.',
    ),
})

export default defineBlokkliAgentTool({
  name: 'rearrange_blocks',
  description:
    'Rearrange blocks within a single field by specifying the desired order. You must provide ALL block UUIDs that are currently in the field — use get_child_blocks to get them. This only reorders, it does not add or remove blocks.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'rearranged blocks' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentRearrangeBlocksRunning', 'Rearranging blocks...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['rearrangeBlocks'],
  execute(ctx, params) {
    const { blocks, types, context, state, $t } = ctx.app

    // Resolve parent entity type and bundle
    const isRootEntity = params.parent.uuid === context.value.entityUuid
    const entityType = isRootEntity ? context.value.entityType : itemEntityType
    const bundle = isRootEntity
      ? context.value.entityBundle
      : blocks.getBlock(params.parent.uuid)?.bundle

    if (!bundle) {
      return { error: 'Parent not found.' }
    }

    // Validate the field exists
    const field = types.getFieldConfig(entityType, bundle, params.parent.field)
    if (!field) {
      const availableFields = types.fieldConfig
        .forEntityTypeAndBundle(entityType, bundle)
        .map((f) => f.name)
      return {
        error: `Field "${params.parent.field}" not found on bundle "${bundle}". Available fields: ${availableFields.length ? availableFields.join(', ') : 'none'}.`,
      }
    }

    // Get the current blocks in this field
    const mutatedField = state.mutatedFields.value.find(
      (f) =>
        f.entityUuid === params.parent.uuid && f.name === params.parent.field,
    )

    if (!mutatedField || mutatedField.list.length === 0) {
      return {
        error: `Field "${params.parent.field}" has no blocks on parent "${params.parent.uuid}".`,
      }
    }

    const currentUuids = mutatedField.list.map((item) => item.uuid)

    // Check that the provided UUIDs match the current field contents exactly
    if (params.uuids.length !== currentUuids.length) {
      return {
        error: `Expected ${currentUuids.length} UUIDs (all blocks in the field), got ${params.uuids.length}. Current UUIDs: ${currentUuids.join(', ')}`,
      }
    }

    const providedSet = new Set(params.uuids)
    const currentSet = new Set(currentUuids)

    // Check for duplicates
    if (providedSet.size !== params.uuids.length) {
      return { error: 'Duplicate UUIDs provided.' }
    }

    // Check that all provided UUIDs exist in the field
    for (const uuid of params.uuids) {
      if (!currentSet.has(uuid)) {
        return {
          error: `Block "${uuid}" is not in field "${params.parent.field}". Current UUIDs: ${currentUuids.join(', ')}`,
        }
      }
    }

    // Check that all current UUIDs are provided
    for (const uuid of currentUuids) {
      if (!providedSet.has(uuid)) {
        return {
          error: `Missing block "${uuid}" from the provided list. You must include ALL blocks in the field.`,
        }
      }
    }

    // Check if the order is actually different
    const isAlreadyInOrder = params.uuids.every(
      (uuid, i) => uuid === currentUuids[i],
    )
    if (isAlreadyInOrder) {
      return { error: 'The blocks are already in the requested order.' }
    }

    const label = $t(
      'aiAgentRearrangeBlocksDone',
      'Rearranged @count blocks',
    ).replace('@count', String(params.uuids.length))

    return {
      type: 'move' as const,
      label,
      affectedUuids: params.uuids,
      apply: (adapter) =>
        adapter.rearrangeBlocks({
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          uuids: params.uuids,
        }),
    }
  },
})
