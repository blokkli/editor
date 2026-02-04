import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuidA: z.string().describe('First block UUID'),
  uuidB: z.string().describe('Second block UUID'),
})

export default defineBlokkliAgentTool({
  name: 'swap_blocks',
  description:
    'Swap the positions of two blocks, either in the same field or different fields.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) => $t('aiAgentSwapBlocksRunning', 'Swapping blocks...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['swapBlocks'],
  execute: (ctx, params) => {
    const { blocks, types, $t } = ctx.app

    // Same block - nothing to do
    if (params.uuidA === params.uuidB) {
      return { error: 'Both UUIDs refer to the same block' }
    }

    // Validate block A exists
    const blockA = blocks.getBlock(params.uuidA)
    if (!blockA) {
      return { error: `Block not found: ${params.uuidA}` }
    }

    // Validate block B exists
    const blockB = blocks.getBlock(params.uuidB)
    if (!blockB) {
      return { error: `Block not found: ${params.uuidB}` }
    }

    // Get field config for A's parent field
    const fieldConfigA = types.getFieldConfig(
      blockA.host.type,
      blockA.host.bundle,
      blockA.host.fieldName,
    )
    if (!fieldConfigA) {
      return { error: `Could not find field config for block A's parent field` }
    }

    // Get field config for B's parent field
    const fieldConfigB = types.getFieldConfig(
      blockB.host.type,
      blockB.host.bundle,
      blockB.host.fieldName,
    )
    if (!fieldConfigB) {
      return { error: `Could not find field config for block B's parent field` }
    }

    // Check if blockA's bundle is allowed in fieldB
    if (!fieldConfigB.allowedBundles.includes(blockA.bundle)) {
      return {
        error: `Cannot swap: bundle "${blockA.bundle}" (uuid: ${params.uuidA}) is not allowed in field "${blockB.host.fieldName}" (parent: ${blockB.host.uuid}). Allowed bundles: ${fieldConfigB.allowedBundles.join(', ')}`,
      }
    }

    // Check if blockB's bundle is allowed in fieldA
    if (!fieldConfigA.allowedBundles.includes(blockB.bundle)) {
      return {
        error: `Cannot swap: bundle "${blockB.bundle}" (uuid: ${params.uuidB}) is not allowed in field "${blockA.host.fieldName}" (parent: ${blockA.host.uuid}). Allowed bundles: ${fieldConfigA.allowedBundles.join(', ')}`,
      }
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
