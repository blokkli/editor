import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The UUIDs of the blocks to delete'),
})

export default defineBlokkliAgentTool({
  name: 'delete_blocks',
  description:
    'Delete one or more blocks from the page. Requires user approval before the blocks are actually deleted.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'deleted blocks' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentDeleteBlocksRunning', 'Deleting blocks...')
  },
  lazy: true,
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['deleteBlocks'],
  execute(ctx, params) {
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
        ? $t('aiAgentDeleteBlockDone', 'Deleted @bundle').replace(
            '@bundle',
            types.getBlockLabel(firstBlock.bundle),
          )
        : $t('aiAgentDeleteBlocksDone', 'Deleted @count blocks').replace(
            '@count',
            String(validBlocks.length),
          )

    // Return the action for the framework to handle
    return {
      type: 'delete' as const,
      label,
      apply: (adapter) => adapter.deleteBlocks(params.uuids),
    }
  },
})
