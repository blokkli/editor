import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The UUIDs of the blocks to move'),
  parent: parentSchema.describe('The target parent entity'),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'move_blocks',
  description:
    'Move one or more blocks to a different parent field. All blocks are moved to the same location and they KEEP their UUIDs!!',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) => $t('aiAgentMoveBlocksRunning', 'Moving blocks...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['moveMultipleBlocks'],
  execute: (ctx, params) => {
    const { blocks, types } = ctx.app

    if (params.uuids.length === 0) {
      return { error: 'No block UUIDs provided' }
    }

    // Validate that all blocks exist
    const validBlocks: Array<{ uuid: string; bundle: string }> = []
    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        return { error: `Block not found: ${uuid}` }
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
          afterUuid: params.afterUuid ?? null,
        }),
    }
  },
})
