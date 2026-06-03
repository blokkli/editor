import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition, resolveHost } from '../helpers'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
  validateFieldCardinality,
} from '../../helpers/validation'
import { getFieldKey } from '#blokkli/helpers'

export const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The UUIDs of the paragraphs to move'),
  parent: parentSchema.describe('The target parent entity'),
  position: positionSchema,
})

export const resultSchema = mutationResultSchema

export default defineBlokkliAgentTool({
  name: 'move_paragraphs',
  description:
    'Move one or more paragraphs to a different parent field. All paragraphs are moved to the same location and they KEEP their UUIDs!!',
  category: 'mutation',
  lazy: true,
  prunedSummary: (r) => (r.success ? 'moved paragraphs' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentMoveBlocksRunning', 'Moving blocks', { more: true })
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['moveMultipleBlocks'],
  execute(ctx, params) {
    const { blocks, types } = ctx.app

    if (params.uuids.length === 0) {
      return { error: 'No paragraph UUIDs provided' }
    }

    // Validate that all blocks exist
    const validBlocks: Array<{
      uuid: string
      bundle: string
      currentFieldKey: string
    }> = []
    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        return { error: `Paragraph not found: ${uuid}` }
      }
      validBlocks.push({
        uuid,
        bundle: block.bundle,
        currentFieldKey: getFieldKey(block.host.uuid, block.host.fieldName),
      })
    }

    // Check edit permission for all bundles being moved
    const denied = requireBundlePermission(
      ctx.app,
      validBlocks.map((b) => b.bundle),
      'edit',
    )
    if (denied) return denied

    // Check ancestor restrictions on source blocks and target parent
    const ancestorDenied = requireNoRestrictedAncestor(ctx.app, params.uuids)
    if (ancestorDenied) return ancestorDenied
    if (ctx.app.permissions.blockHasRestrictedAncestor(params.parent.uuid)) {
      return {
        error:
          'Permission denied: target parent is inside a block with restricted editing permissions',
      }
    }

    // Validate target field cardinality. Only blocks coming from another field
    // increase the target's count — same-field reorders leave it unchanged.
    const targetHost = resolveHost(ctx.app, params.parent.uuid)
    if (!targetHost) {
      return {
        error: `Target parent "${params.parent.uuid}" not found. Use get_page_structure or get_child_paragraphs to find a valid parent UUID.`,
      }
    }
    const targetFieldKey = getFieldKey(params.parent.uuid, params.parent.field)
    const additionalCount = validBlocks.filter(
      (b) => b.currentFieldKey !== targetFieldKey,
    ).length
    if (additionalCount > 0) {
      const cardinality = validateFieldCardinality(
        ctx.app,
        {
          type: targetHost.entityType,
          uuid: params.parent.uuid,
          fieldName: params.parent.field,
          bundle: targetHost.bundle,
        },
        targetFieldKey,
        additionalCount,
      )
      if (!cardinality.valid) {
        return { error: cardinality.error }
      }
    }

    // Create label based on number of blocks
    const { $t } = ctx.app
    const firstBlock = validBlocks[0]
    const label =
      validBlocks.length === 1 && firstBlock
        ? $t('aiAgentMoveBlockDone', 'Moved @bundle').replace(
            '@bundle',
            types.getBlockLabel(firstBlock.bundle),
          )
        : $t('aiAgentMoveBlocksDone', 'Moved @count blocks').replace(
            '@count',
            String(validBlocks.length),
          )

    // Resolve position to afterUuid
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

    // Return the action for the framework to handle
    return {
      type: 'move' as const,
      label,
      apply: (adapter) =>
        adapter.moveMultipleBlocks({
          uuids: params.uuids,
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
