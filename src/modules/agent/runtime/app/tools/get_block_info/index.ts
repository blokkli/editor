import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema } from '../schemas'

const paramsSchema = z.object({
  uuids: z.array(z.string()).describe('The block UUIDs'),
})

const blockInfoSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type/bundle'),
  options: z.record(z.string(), z.unknown()).describe('Block options'),
  parent: parentSchema
    .nullable()
    .describe('The parent entity containing this block'),
})

const resultSchema = z.object({
  blocks: z
    .array(blockInfoSchema)
    .describe('Information about the requested blocks'),
  notFound: z.array(z.string()).describe('UUIDs of blocks that were not found'),
})

export default defineBlokkliAgentTool({
  name: 'get_block_info',
  description:
    'Get lightweight info for multiple blocks (bundle, current option values, parent). ' +
    'For detailed single-block analysis with option definitions, content fields, and children, use get_block_context instead.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('aiAgentGetBlockInfoRunning', 'Getting block info...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, state, context, types, $t } = ctx.app

    const result: z.infer<typeof resultSchema> = {
      blocks: [],
      notFound: [],
    }

    for (const uuid of params.uuids) {
      const block = blocks.getBlock(uuid)
      if (!block) {
        result.notFound.push(uuid)
        continue
      }

      const item = state.getFieldListItem(uuid)
      const fieldList = state.getFieldListForBlock(uuid)

      // Determine the parent - if parent is the page, use page entity type, otherwise it's a block
      let parent: z.infer<typeof parentSchema> | null = null
      if (fieldList) {
        const parentType =
          fieldList.entityUuid === context.value.entityUuid
            ? context.value.entityType
            : ctx.itemEntityType
        parent = {
          type: parentType,
          uuid: fieldList.entityUuid,
          field: fieldList.name,
        }
      }

      result.blocks.push({
        uuid,
        bundle: block.bundle,
        options: item?.options ?? {},
        parent,
      })
    }

    // Build label based on results
    const count = result.blocks.length
    const firstBlock = result.blocks[0]
    const label =
      count === 1 && firstBlock
        ? $t('aiAgentGetBlockInfoDone', 'Got info for @bundle').replace(
            '@bundle',
            types.getBlockLabel(firstBlock.bundle),
          )
        : $t(
            'aiAgentGetBlockInfoMultipleDone',
            'Got info for @count blocks',
          ).replace('@count', String(count))

    // Select the blocks that were found
    const affectedUuids = result.blocks.map((b) => b.uuid)

    return { label, result, affectedUuids }
  },
})
