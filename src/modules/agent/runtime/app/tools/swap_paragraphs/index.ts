import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'
import { getSwapDisabledReason } from '#blokkli/editor/helpers/swap'

const paramsSchema = z.object({
  uuidA: z.string().describe('First paragraph UUID'),
  uuidB: z.string().describe('Second paragraph UUID'),
})

export default defineBlokkliAgentTool({
  name: 'swap_paragraphs',
  description:
    'Swap the positions of two paragraphs, either in the same field or different fields.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'swapped paragraphs' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t('aiAgentSwapBlocksRunning', 'Swapping blocks', { more: true })
  },
  lazy: true,
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['swapBlocks'],
  execute(ctx, params) {
    const { blocks, types, $t, permissions } = ctx.app

    // Validate block A exists
    const blockA = blocks.getBlock(params.uuidA)
    if (!blockA) {
      return { error: `Paragraph not found: ${params.uuidA}` }
    }

    // Validate block B exists
    const blockB = blocks.getBlock(params.uuidB)
    if (!blockB) {
      return { error: `Paragraph not found: ${params.uuidB}` }
    }

    const reason = getSwapDisabledReason(blockA, blockB, {
      getFieldConfig: types.getFieldConfig,
      checkBlockBundlePermission: permissions.checkBlockBundlePermission,
      blockHasRestrictedAncestor: permissions.blockHasRestrictedAncestor,
    })
    if (reason) {
      return { error: reason }
    }

    // Create labels
    const labelA = types.getBlockLabel(blockA.bundle)
    const labelB = types.getBlockLabel(blockB.bundle)
    const label = $t('aiAgentSwapBlocksDone', 'Swapped @bundleA and @bundleB')
      .replace('@bundleA', labelA)
      .replace('@bundleB', labelB)

    return {
      type: 'move' as const,
      label,
      affectedUuids: [params.uuidA, params.uuidB],
      apply: (adapter) => adapter.swapBlocks(params.uuidA, params.uuidB),
    }
  },
})
