import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema } from '../schemas'
import {
  getAvailableOptions,
  getMutatedOptionValue,
  optionValueToStorable,
} from '#blokkli/editor/helpers/options'

const paramsSchema = z.object({
  // Bundle filters
  bundle: z.string().optional().describe('Filter by exact bundle name'),
  bundles: z
    .array(z.string())
    .optional()
    .describe('Filter by any of these bundles'),

  // Structure filters
  hasChildren: z
    .boolean()
    .optional()
    .describe('Filter by whether block has child blocks'),
  isRootLevel: z
    .boolean()
    .optional()
    .describe('Filter to root level blocks (nesting 0)'),
  nestingLevel: z.number().optional().describe('Filter to exact nesting level'),
  parentBundle: z
    .string()
    .optional()
    .describe('Filter to blocks whose parent is this bundle'),
  inField: z
    .string()
    .optional()
    .describe('Filter to blocks in a field with this name'),

  // Content filters
  containsText: z
    .string()
    .optional()
    .describe('Filter to blocks containing this text (case-insensitive)'),

  // Option filters
  optionEquals: z
    .object({
      key: z.string().describe('Option key to check'),
      value: z
        .union([z.string(), z.boolean(), z.number()])
        .describe('Expected option value'),
    })
    .optional()
    .describe('Filter to blocks where an option equals a value'),

  // Pagination
  limit: z
    .number()
    .optional()
    .default(50)
    .describe('Maximum number of results to return (default: 50)'),
})

const blockResultSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type'),
  label: z.string().describe('Human-readable block label'),
  nestingLevel: z.number().describe('Nesting depth (0 = root level)'),
  parent: parentSchema.describe('The parent entity containing this block'),
})

const resultSchema = z.object({
  blocks: z.array(blockResultSchema).describe('Blocks matching the filters'),
  total: z.number().describe('Total number of matches before pagination'),
  hasMore: z
    .boolean()
    .describe('Whether there are more results beyond the limit'),
})

export default defineBlokkliAgentTool({
  name: 'find_blocks',
  description:
    'Find blocks matching multiple filter criteria. Supports filtering by bundle, structure (nesting, parent, field), content, and options. Returns paginated results.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('aiAgentFindBlocksRunning', 'Finding blocks...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, state, context, types, dom, definitions, $t } = ctx.app
    const limit = params.limit ?? 50

    // Start with all blocks
    let candidates = blocks.getAllBlocks()

    // Filter by bundle (single)
    if (params.bundle) {
      candidates = candidates.filter((block) => block.bundle === params.bundle)
    }

    // Filter by bundles (multiple)
    if (params.bundles && params.bundles.length > 0) {
      const bundleSet = new Set(params.bundles)
      candidates = candidates.filter((block) => bundleSet.has(block.bundle))
    }

    // Filter by nesting level (isRootLevel)
    if (params.isRootLevel === true) {
      candidates = candidates.filter(
        (block) => state.getNestingLevel(block.uuid) === 0,
      )
    } else if (params.isRootLevel === false) {
      candidates = candidates.filter(
        (block) => state.getNestingLevel(block.uuid) > 0,
      )
    }

    // Filter by exact nesting level
    if (params.nestingLevel !== undefined) {
      candidates = candidates.filter(
        (block) => state.getNestingLevel(block.uuid) === params.nestingLevel,
      )
    }

    // Filter by inField
    if (params.inField) {
      candidates = candidates.filter((block) => {
        const fieldList = state.getFieldListForBlock(block.uuid)
        return fieldList?.name === params.inField
      })
    }

    // Filter by parentBundle
    if (params.parentBundle) {
      candidates = candidates.filter((block) => {
        const parentUuid = state.getParentEntityUuid(block.uuid)
        if (!parentUuid || parentUuid === context.value.entityUuid) {
          return false
        }
        const parentBlock = blocks.getBlock(parentUuid)
        return parentBlock?.bundle === params.parentBundle
      })
    }

    // Filter by hasChildren
    if (params.hasChildren !== undefined) {
      const mutatedFields = state.mutatedFields.value
      candidates = candidates.filter((block) => {
        const hasChildFields = mutatedFields.some(
          (field) => field.entityUuid === block.uuid && field.list.length > 0,
        )
        return params.hasChildren ? hasChildFields : !hasChildFields
      })
    }

    // Filter by optionEquals
    if (params.optionEquals) {
      const { key, value } = params.optionEquals
      candidates = candidates.filter((block) => {
        // Get the block definition with proper context
        const definition = definitions.getBlockDefinition(
          block.bundle,
          block.fieldListType,
          block.parentBlockBundle,
        )
        if (!definition) return false

        // Get available options for this block
        const availableOptions = getAvailableOptions(
          definition.options,
          definition.globalOptions as string[] | undefined,
          definitions.globalOptions.value as Record<string, any>,
        )

        // Find the option definition
        const optionDef = availableOptions.find((o) => o.property === key)
        if (!optionDef) return false

        // Get the current value (with default fallback)
        const currentValue = getMutatedOptionValue(
          state.mutatedOptions,
          block.uuid,
          key,
          optionDef.option.default,
        )

        // Convert both values to storable format for comparison
        const storableQueryValue = optionValueToStorable(
          optionDef.option,
          value,
        )
        const storableCurrentValue = optionValueToStorable(
          optionDef.option,
          currentValue,
        )

        return storableCurrentValue === storableQueryValue
      })
    }

    // Filter by containsText (most expensive, do last)
    if (params.containsText) {
      const searchText = params.containsText.toLowerCase()
      candidates = candidates.filter((block) => {
        const el = dom.getDragElement(block)
        if (!el) return false
        const text = el.textContent?.toLowerCase() || ''
        return text.includes(searchText)
      })
    }

    // Get total count before pagination
    const total = candidates.length
    const hasMore = total > limit

    // Paginate and build result
    const limitedCandidates = candidates.slice(0, limit)
    const resultBlocks: z.infer<typeof blockResultSchema>[] = []

    for (const block of limitedCandidates) {
      const fieldList = state.getFieldListForBlock(block.uuid)
      if (!fieldList) continue

      const parentType =
        fieldList.entityUuid === context.value.entityUuid
          ? context.value.entityType
          : ctx.itemEntityType

      resultBlocks.push({
        uuid: block.uuid,
        bundle: block.bundle,
        label: types.getBlockLabel(block.bundle),
        nestingLevel: state.getNestingLevel(block.uuid),
        parent: {
          type: parentType,
          uuid: fieldList.entityUuid,
          field: fieldList.name,
        },
      })
    }

    return {
      label: $t('aiAgentFindBlocksDone', 'Found @count blocks').replace(
        '@count',
        String(total),
      ),
      result: {
        blocks: resultBlocks,
        total,
        hasMore,
      },
      // Select blocks if there's only one match
      affectedUuids:
        resultBlocks.length === 1 ? [resultBlocks[0]!.uuid] : undefined,
    }
  },
})
