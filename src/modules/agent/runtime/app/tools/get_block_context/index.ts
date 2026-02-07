import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  parentSchema,
  blockOptionsMapSchema,
  buildBlockOptionsMap,
} from '../schemas'
import { getAvailableOptions } from '#blokkli/editor/helpers/options'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  includeParentChain: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include ancestor parent blocks up to the page'),
  includeSiblings: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include sibling blocks in the same field'),
  includeChildren: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include child fields summary'),
  includeContentFields: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include content fields (text, media, links) with values'),
  includeOptions: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include block options'),
})

const parentChainItemSchema = z.object({
  uuid: z.string().describe('The parent block UUID'),
  bundle: z.string().describe('The block type'),
  label: z.string().describe('Human-readable block label'),
  fieldName: z.string().describe('The field name this block is in'),
})

const siblingInfoSchema = z.object({
  total: z.number().describe('Total number of siblings including this block'),
  position: z.number().describe('1-based position of this block'),
  prev: z
    .object({
      uuid: z.string(),
      bundle: z.string(),
    })
    .nullable()
    .describe('Previous sibling block'),
  next: z
    .object({
      uuid: z.string(),
      bundle: z.string(),
    })
    .nullable()
    .describe('Next sibling block'),
})

const childFieldSchema = z.object({
  name: z.string().describe('Field name'),
  label: z.string().describe('Human-readable field label'),
  count: z.number().describe('Number of blocks in this field'),
  cardinality: z.number().describe('Max blocks allowed (-1 = unlimited)'),
  bundles: z.array(z.string()).describe('Unique bundle types in this field'),
})

const contentFieldSchema = z.discriminatedUnion('type', [
  z.object({
    fieldName: z.string().describe('The field name'),
    type: z.literal('plain').describe('Plain text field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    fieldName: z.string().describe('The field name'),
    type: z.literal('markup').describe('Rich text / HTML field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    fieldName: z.string().describe('The field name'),
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
    fieldName: z.string().describe('The field name'),
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
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type'),
  label: z.string().describe('Human-readable block label'),
  nestingLevel: z.number().describe('Nesting depth (0 = root level)'),
  parent: parentSchema
    .nullable()
    .describe('The parent entity containing this block'),

  parentChain: z
    .array(parentChainItemSchema)
    .optional()
    .describe('Ancestor parent blocks from immediate parent to page'),

  siblings: siblingInfoSchema
    .optional()
    .describe('Information about sibling blocks in the same field'),

  childFields: z
    .array(childFieldSchema)
    .optional()
    .describe('Child fields with block counts'),

  contentFields: z
    .array(contentFieldSchema)
    .optional()
    .describe('Content fields (text, media, links) with current values'),

  options: blockOptionsMapSchema
    .optional()
    .describe('Block options with current values'),
})

export default defineBlokkliAgentTool({
  name: 'get_block_context',
  description:
    'Get comprehensive context for a single block including parent chain, siblings, children, content fields, and options. Preferred over multiple individual tool calls.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetBlockContextRunning', 'Getting block context...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const {
      blocks,
      state,
      context,
      types,
      directive,
      definitions,
      selection,
      $t,
    } = ctx.app

    // Get the block
    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return {
        error: `Block not found: ${params.uuid}`,
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
            fieldName: parentField.name,
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
      const editables = directive.getEditablesForBlock(params.uuid)
      for (const editable of editables) {
        const config = types.editableFieldConfig.forName(
          ctx.itemEntityType,
          block.bundle,
          editable.fieldName,
        )
        if (!config) continue
        if (config.type === 'table') continue

        const fieldType: 'plain' | 'markup' =
          config.type === 'frame' || config.type === 'markup'
            ? 'markup'
            : 'plain'

        let currentValue = ''
        if (editable.getValue) {
          currentValue = editable.getValue()
        } else {
          const element = directive.findEditableElement(editable.fieldName, {
            type: ctx.itemEntityType,
            uuid: params.uuid,
            bundle: block.bundle,
          })
          if (element) {
            currentValue =
              fieldType === 'markup'
                ? element.innerHTML || ''
                : element.textContent || ''
          }
        }

        fields.push({
          fieldName: editable.fieldName,
          type: fieldType,
          currentValue,
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
          fieldName: config.name,
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
      const definition = definitions.getBlockDefinition(
        block.bundle,
        selectionItem?.fieldListType ?? 'default',
        selectionItem?.parentBlockBundle,
      )

      if (definition) {
        const availableOptions = getAvailableOptions(
          definition.options,
          definition.globalOptions as string[] | undefined,
          definitions.globalOptions.value as Record<string, any>,
        )

        if (availableOptions.length > 0) {
          result.options = buildBlockOptionsMap(
            availableOptions,
            state.mutatedOptions,
            params.uuid,
          )
        }
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
