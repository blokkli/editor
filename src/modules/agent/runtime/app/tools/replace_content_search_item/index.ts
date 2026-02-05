import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema } from '../schemas'
import type { SearchContentItem } from '#blokkli/editor/features/search/types'

const paramsSchema = z.object({
  uuid: z
    .string()
    .describe('The block UUID containing the content reference field'),
  fieldName: z.string().describe('The content field name (reference type)'),
  itemId: z
    .string()
    .describe('Content item ID from search_content_* results'),
  itemEntityType: z.string().describe('Entity type of the content item'),
  itemEntityBundle: z.string().describe('Entity bundle of the content item'),
})

export default defineBlokkliAgentTool({
  name: 'replace_content_search_item',
  description:
    'Replace a content reference on an existing block field. Use get_content_fields first to see available reference fields, then search_content_* to find content items.',
  category: 'mutation',
  modes: ['editing'],
  label: ($t) =>
    $t(
      'aiAgentReplaceContentSearchItemRunning',
      'Replacing content reference...',
    ),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['replaceContentSearchItem'],
  execute: (ctx, params) => {
    const { blocks, types, $t } = ctx.app

    // Validate block exists.
    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return { error: `Block not found: ${params.uuid}` }
    }

    // Validate field exists and is a droppable field.
    const config = types.droppableFieldConfig.forName(
      ctx.itemEntityType,
      block.bundle,
      params.fieldName,
    )
    if (!config) {
      return {
        error: `Field "${params.fieldName}" is not a reference content field on ${block.bundle} blocks`,
      }
    }
    const allowedRestriction = config.allowed.find(
      (v) => v.type === params.itemEntityType,
    )
    if (!allowedRestriction) {
      return {
        error: `Field "${params.fieldName}" does not accept ${params.itemEntityType} entities. Allowed types: ${config.allowed.map((v) => v.type).join(', ')}`,
      }
    }
    if (!allowedRestriction.bundles.includes(params.itemEntityBundle)) {
      return {
        error: `Field "${params.fieldName}" does not accept ${params.itemEntityBundle} bundles. Allowed: ${allowedRestriction.bundles.join(', ')}`,
      }
    }

    const item: SearchContentItem = {
      id: params.itemId,
      entityType: params.itemEntityType,
      entityBundle: params.itemEntityBundle,
      title: params.itemId,
      targetBundles: [],
    }

    return {
      type: 'rewrite' as const,
      label: $t(
        'aiAgentReplaceContentSearchItemDone',
        'Replaced content reference on @field',
      ).replace('@field', config.label),
      apply: (adapter) =>
        adapter.replaceContentSearchItem!({
          host: {
            type: ctx.itemEntityType,
            uuid: params.uuid,
            fieldName: params.fieldName,
          },
          item,
        }),
      affectedUuids: [params.uuid],
    }
  },
})
