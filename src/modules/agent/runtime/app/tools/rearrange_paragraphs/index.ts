import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'
import { resolveHost } from '../helpers'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'

export const paramsSchema = z.object({
  parent: parentSchema.describe('The parent field containing the paragraphs'),
  uuids: z
    .array(z.string())
    .min(2)
    .describe(
      'The UUIDs of the paragraphs in the desired order. Must include ALL paragraphs currently in the field.',
    ),
})

export const resultSchema = mutationResultSchema

export default defineBlokkliAgentTool({
  name: 'rearrange_paragraphs',
  description:
    'Rearrange paragraphs within a single field by specifying the desired order. You must provide ALL paragraph UUIDs that are currently in the field — use get_child_paragraphs to get them. This only reorders, it does not add or remove paragraphs.',
  category: 'mutation',
  lazy: true,
  prunedSummary: (r) => (r.success ? 'rearranged paragraphs' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentRearrangeBlocksRunning', 'Rearranging blocks', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['rearrangeBlocks'],
  execute(ctx, params) {
    const { blocks, types, state, $t } = ctx.app

    // Resolve parent entity type and bundle
    const host = resolveHost(ctx.app, params.parent.uuid)
    if (!host) {
      return { error: 'Parent not found.' }
    }
    const { entityType, bundle } = host

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
        error: `Field "${params.parent.field}" has no paragraphs on parent "${params.parent.uuid}".`,
      }
    }

    const currentUuids = mutatedField.list.map((item) => item.uuid)

    // Check that the provided UUIDs match the current field contents exactly
    if (params.uuids.length !== currentUuids.length) {
      return {
        error: `Expected ${currentUuids.length} UUIDs (all paragraphs in the field), got ${params.uuids.length}. Current UUIDs: ${currentUuids.join(', ')}`,
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
          error: `Paragraph "${uuid}" is not in field "${params.parent.field}". Current UUIDs: ${currentUuids.join(', ')}`,
        }
      }
    }

    // Check that all current UUIDs are provided
    for (const uuid of currentUuids) {
      if (!providedSet.has(uuid)) {
        return {
          error: `Missing paragraph "${uuid}" from the provided list. You must include ALL paragraphs in the field.`,
        }
      }
    }

    // Check edit permission for all bundles being rearranged
    const blockBundles = params.uuids
      .map((uuid) => blocks.getBlock(uuid)?.bundle)
      .filter((b): b is string => !!b)
    if (blockBundles.length) {
      const denied = requireBundlePermission(ctx.app, blockBundles, 'edit')
      if (denied) return denied
    }

    // Check ancestor restrictions
    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, params.uuids)
    if (ancestorDenied) return ancestorDenied

    // Check if the order is actually different
    const isAlreadyInOrder = params.uuids.every(
      (uuid, i) => uuid === currentUuids[i],
    )
    if (isAlreadyInOrder) {
      return { error: 'The paragraphs are already in the requested order.' }
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
