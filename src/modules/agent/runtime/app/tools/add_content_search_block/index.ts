import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'
import type { SearchContentItem } from '#blokkli/editor/features/search/types'

const paramsSchema = z.object({
  itemId: z
    .string()
    .describe('Content item ID from search_content_* results'),
  itemEntityType: z
    .string()
    .describe('Entity type of the content item'),
  itemEntityBundle: z
    .string()
    .describe('Entity bundle of the content item'),
  targetBundle: z
    .string()
    .describe(
      'Block bundle to create (from targetBundles in search_content_* results)',
    ),
  parent: parentSchema.describe('The parent entity to add the block to'),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'add_content_search_block',
  description:
    'Add a block using a content item from search results. Use search_content_* first to find content items, then use this tool to add one to the page. Requires user approval.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) =>
    $t('aiAgentAddContentSearchBlockRunning', 'Adding content block...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addContentSearchItem'],
  execute: (ctx, params) => {
    const { $t, types } = ctx.app
    const item: SearchContentItem = {
      id: params.itemId,
      entityType: params.itemEntityType,
      entityBundle: params.itemEntityBundle,
      title: params.itemId,
      targetBundles: [params.targetBundle],
    }

    return {
      type: 'add' as const,
      label: $t(
        'aiAgentAddContentSearchBlockDone',
        'Added @bundle with content ID @id',
      )
        .replace('@bundle', types.getBlockLabel(params.targetBundle))
        .replace('@id', params.itemId),
      apply: (adapter) =>
        adapter.addContentSearchItem({
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: params.afterUuid ?? null,
          item,
          bundle: params.targetBundle,
        }),
    }
  },
})
