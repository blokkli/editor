import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'
import { fromLibraryBlockBundle } from '#blokkli-build/config'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('UUIDs of library blocks to detach'),
})

export default defineBlokkliAgentTool({
  name: 'detach_library_block',
  description:
    'Detach one or more library blocks to create editable copies. ' +
    'IMPORTANT: The original library block UUIDs will no longer exist after detaching. ' +
    'The result includes newBlocks containing the UUIDs and bundles of the newly created editable blocks. ' +
    'Use these new UUIDs for any subsequent operations.',
  category: 'mutation',
  prunedSummary: (r) =>
    r.success ? `detached ${r.newBlocks?.length || 0} blocks` : 'rejected',
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentDetachLibraryBlockRunning', 'Detaching library block...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['detachReusableBlock'],
  execute(ctx, params) {
    const { blocks, $t } = ctx.app

    if (params.uuids.length === 0) {
      return { error: 'No block UUIDs provided' }
    }

    // Validate all blocks exist and are library blocks
    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        return { error: `Block not found: ${uuid}` }
      }
      if (block.bundle !== fromLibraryBlockBundle) {
        return {
          error: `Block ${uuid} is not a library block (bundle: ${block.bundle}). Only ${fromLibraryBlockBundle} blocks can be detached.`,
        }
      }
    }

    const label =
      params.uuids.length === 1
        ? $t('aiAgentDetachLibraryBlockDone', 'Detached library block')
        : $t(
            'aiAgentDetachLibraryBlocksDone',
            'Detached @count library blocks',
          ).replace('@count', String(params.uuids.length))

    return {
      type: 'rewrite' as const,
      label,
      apply: (adapter) => adapter.detachReusableBlock!({ uuids: params.uuids }),
    }
  },
})
