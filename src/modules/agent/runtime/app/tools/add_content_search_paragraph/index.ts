import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
  resolvePosition,
} from '../schemas'
import type { SearchContentItem } from '#blokkli/editor/features/search/types'

const paramsSchema = z.object({
  itemId: z.string().describe('Content item ID from search_content_* results'),
  itemEntityType: z.string().describe('Entity type of the content item'),
  itemEntityBundle: z.string().describe('Entity bundle of the content item'),
  targetBundle: z
    .string()
    .describe(
      'Paragraph bundle to create (from targetBundles in search_content_* results)',
    ),
  parent: parentSchema.describe('The parent entity to add the paragraph to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'add_content_search_paragraphs',
  description:
    'Add a paragraph using a content item from search results. Use search_content_* first to find content items, then use this tool to add one to the page. Requires user approval.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added content paragraph' : 'rejected'),
  modes: ['editing'],
  label($t) {
    return $t(
      'aiAgentAddContentSearchBlockRunning',
      'Adding content paragraph...',
    )
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addContentSearchItem'],
  execute(ctx, params) {
    const { $t, types } = ctx.app
    const item: SearchContentItem = {
      id: params.itemId,
      entityType: params.itemEntityType,
      entityBundle: params.itemEntityBundle,
      title: params.itemId,
      targetBundles: [params.targetBundle],
    }

    // Resolve position to afterUuid
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

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
          afterUuid: resolved.afterUuid,
          item,
          bundle: params.targetBundle,
        }),
    }
  },
})
