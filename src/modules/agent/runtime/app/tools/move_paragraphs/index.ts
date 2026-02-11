import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
  resolvePosition,
} from '../schemas'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The UUIDs of the paragraphs to move'),
  parent: parentSchema.describe('The target parent entity'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'move_paragraphs',
  description:
    'Move one or more paragraphs to a different parent field. All paragraphs are moved to the same location and they KEEP their UUIDs!!',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'moved paragraphs' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentMoveBlocksRunning', 'Moving blocks...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['moveMultipleBlocks'],
  execute(ctx, params) {
    const { blocks, types } = ctx.app

    if (params.uuids.length === 0) {
      return { error: 'No paragraph UUIDs provided' }
    }

    // Validate that all blocks exist
    const validBlocks: Array<{ uuid: string; bundle: string }> = []
    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        return { error: `Paragraph not found: ${uuid}` }
      }
      validBlocks.push({ uuid, bundle: block.bundle })
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
