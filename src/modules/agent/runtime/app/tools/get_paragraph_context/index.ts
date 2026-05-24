import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema, blockOptionsMapSchema } from '../schemas'
import { booleanParam } from '#blokkli/agent/shared/toolParams'
import {
  buildBlockOptionsMap,
  getResolvedOptions,
  readBlockContentFields,
} from '../helpers'
import { fragmentBlockBundle } from '#blokkli-build/config'

const paramsSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  includeParentChain: booleanParam(
    'Include ancestor parent paragraphs up to the page',
  )
    .optional()
    .default(true),
  includeSiblings: booleanParam(
    'Include sibling paragraphs in the same field',
  )
    .optional()
    .default(false),
  includeChildren: booleanParam('Include child fields summary')
    .optional()
    .default(true),
  includeContentFields: booleanParam(
    'Include content fields (text, media, links) with values',
  )
    .optional()
    .default(true),
  includeOptions: booleanParam('Include paragraph options')
    .optional()
    .default(true),
})

const parentChainItemSchema = z.object({
  uuid: z.string().describe('The parent paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  label: z.string().describe('Human-readable paragraph label'),
  field: z.string().describe('The field name this paragraph is in'),
})

const siblingInfoSchema = z.object({
  total: z
    .number()
    .describe('Total number of siblings including this paragraph'),
  position: z.number().describe('1-based position of this paragraph'),
  prev: z
    .object({
      uuid: z.string(),
      bundle: z.string(),
    })
    .nullable()
    .describe('Previous sibling paragraph'),
  next: z
    .object({
      uuid: z.string(),
      bundle: z.string(),
    })
    .nullable()
    .describe('Next sibling paragraph'),
})

const childFieldSchema = z.object({
  name: z.string().describe('Field name'),
  label: z.string().describe('Human-readable field label'),
  count: z.number().describe('Number of paragraphs in this field'),
  cardinality: z.number().describe('Max paragraphs allowed (-1 = unlimited)'),
  bundles: z.array(z.string()).describe('Unique bundle types in this field'),
})

const contentFieldSchema = z.discriminatedUnion('type', [
  z.object({
    field: z.string().describe('The field name'),
    type: z.literal('plain').describe('Plain text field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    field: z.string().describe('The field name'),
    type: z.literal('markup').describe('Rich text / HTML field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    field: z.string().describe('The field name'),
    label: z.string().describe('Human-readable field label'),
    type: z.literal('reference').describe('Entity reference field'),
    allowed: z
      .array(
        z.object({
          type: z.string().describe('The entity type (e.g., "media", "node")'),
          bundles: z
            .array(z.string())
            .describe('The bundles accepted for this entity type'),
        }),
      )
      .describe('Entity types and bundles this field accepts'),
  }),
  z.object({
    field: z.string().describe('The field name'),
    label: z.string().describe('Human-readable field label'),
    type: z.literal('link').describe('Link field'),
    allowed: z
      .array(
        z.object({
          type: z.string().describe('The entity type (e.g., "media", "node")'),
          bundles: z
            .array(z.string())
            .describe('The bundles accepted for this entity type'),
        }),
      )
      .describe('Entity types and bundles this field accepts'),
  }),
])

const resultSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  label: z.string().describe('Human-readable paragraph label'),
  fragmentName: z
    .string()
    .optional()
    .describe('The fragment name, if this paragraph is a fragment block'),
  nestingLevel: z.number().describe('Nesting depth (0 = root level)'),
  parent: parentSchema
    .nullable()
    .describe('The parent entity containing this paragraph'),

  parentChain: z
    .array(parentChainItemSchema)
    .optional()
    .describe('Ancestor parent paragraphs from immediate parent to page'),

  siblings: siblingInfoSchema
    .optional()
    .describe('Information about sibling paragraphs in the same field'),

  childFields: z
    .array(childFieldSchema)
    .optional()
    .describe('Child fields with paragraph counts'),

  contentFields: z
    .array(contentFieldSchema)
    .optional()
    .describe('Content fields (text, media, links) with current values'),

  options: blockOptionsMapSchema
    .optional()
    .describe('Paragraph options with current values'),
})

export default defineBlokkliAgentTool({
  name: 'get_paragraph_context',
  description:
    'Get comprehensive context for a single paragraph including parent chain, siblings, children, content fields, and options. Preferred over multiple individual tool calls.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) =>
    `context for ${r.bundle || 'paragraph'} (${r.uuid?.slice(0, 8) || '?'})`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetBlockContextRunning', 'Getting block context', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { blocks, state, context, types, selection, $t } = ctx.app

    // Get the block
    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return {
        error: `Paragraph not found: ${params.uuid}`,
      }
    }

    const bundleLabel = types.getBlockLabel(block.bundle)

    // Get parent information
    const fieldList = state.getFieldListForBlock(params.uuid)
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

    // Build result
    const result: z.infer<typeof resultSchema> = {
      uuid: params.uuid,
      bundle: block.bundle,
      label: bundleLabel,
      nestingLevel: state.getNestingLevel(params.uuid),
      parent,
    }

    if (block.bundle === fragmentBlockBundle && block.fragment?.name) {
      result.fragmentName = block.fragment.name
    }

    // Build parent chain (ancestor blocks)
    if (params.includeParentChain) {
      const parentChain: z.infer<typeof parentChainItemSchema>[] = []
      let currentUuid: string | null = state.getParentEntityUuid(params.uuid)

      while (currentUuid && currentUuid !== context.value.entityUuid) {
        const parentBlock = blocks.getBlock(currentUuid)
        const parentField = state.getFieldListForBlock(currentUuid)

        if (parentBlock && parentField) {
          parentChain.push({
            uuid: currentUuid,
            bundle: parentBlock.bundle,
            label: types.getBlockLabel(parentBlock.bundle),
            field: parentField.name,
          })
        }

        currentUuid = state.getParentEntityUuid(currentUuid)
      }

      result.parentChain = parentChain
    }

    // Get sibling information
    if (params.includeSiblings && fieldList) {
      const siblings = fieldList.list
      const currentIndex = siblings.findIndex(
        (item) => item.uuid === params.uuid,
      )

      if (currentIndex !== -1) {
        const prevSibling = currentIndex > 0 ? siblings[currentIndex - 1] : null
        const nextSibling =
          currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null

        result.siblings = {
          total: siblings.length,
          position: currentIndex + 1,
          prev: prevSibling
            ? { uuid: prevSibling.uuid, bundle: prevSibling.bundle }
            : null,
          next: nextSibling
            ? { uuid: nextSibling.uuid, bundle: nextSibling.bundle }
            : null,
        }
      }
    }

    // Get child fields
    if (params.includeChildren) {
      const mutatedFields = state.mutatedFields.value
      const childFields: z.infer<typeof childFieldSchema>[] = []

      for (const field of mutatedFields) {
        if (field.entityUuid === params.uuid && field.list.length > 0) {
          const uniqueBundles = [
            ...new Set(field.list.map((item) => item.bundle)),
          ]
          // Get field config for label and cardinality
          const fieldConfig = types.fieldConfig.forName(
            field.entityType,
            block.bundle,
            field.name,
          )
          childFields.push({
            name: field.name,
            label: fieldConfig?.label || field.name,
            count: field.list.length,
            cardinality: fieldConfig?.cardinality ?? -1,
            bundles: uniqueBundles,
          })
        }
      }

      if (childFields.length > 0) {
        result.childFields = childFields
      }
    }

    // Get content fields (text, media, links)
    if (params.includeContentFields) {
      const fields: z.infer<typeof contentFieldSchema>[] = []

      // Editable text fields
      for (const f of readBlockContentFields(
        ctx.app,
        params.uuid,
        ctx.itemEntityType,
        block.bundle,
      )) {
        fields.push({
          field: f.fieldName,
          type: f.fieldType,
          currentValue: f.value,
        })
      }

      // Droppable fields (reference and link)
      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          ctx.itemEntityType,
          block.bundle,
        )
      for (const config of droppableConfigs) {
        fields.push({
          field: config.name,
          label: config.label,
          type: config.type as 'reference' | 'link',
          allowed: config.allowed,
        })
      }

      if (fields.length > 0) {
        result.contentFields = fields
      }
    }

    // Get options with full definitions
    if (params.includeOptions) {
      // Get block definition with context
      const selectionItem = selection.items.value.find(
        (v) => v.uuid === params.uuid,
      )
      const availableOptions = getResolvedOptions(
        ctx.app,
        block.bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle ?? null,
      )

      if (availableOptions && availableOptions.length > 0) {
        result.options = buildBlockOptionsMap(
          availableOptions,
          state.mutatedOptions,
          params.uuid,
        )
      }
    }

    return {
      label: $t(
        'aiAgentGetBlockContextDone',
        'Got context for @bundle',
      ).replace('@bundle', bundleLabel),
      result,
      affectedUuids: [params.uuid],
    }
  },
})
