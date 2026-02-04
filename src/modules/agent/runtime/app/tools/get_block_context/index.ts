import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema } from '../schemas'
import {
  getAvailableOptions,
  getMutatedOptionValue,
} from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'

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
  includeEditableFields: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include editable text fields with values'),
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

const editableFieldSchema = z.object({
  fieldName: z.string().describe('The field name'),
  fieldType: z
    .enum(['plain', 'markup'])
    .describe('Whether field accepts HTML or plain text'),
  currentValue: z.string().describe('Current field value'),
})

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

  editableFields: z
    .array(editableFieldSchema)
    .optional()
    .describe('Editable text fields with current values'),

  options: z
    .array(
      z.object({
        property: z.string().describe('The option property name'),
        type: z.string().describe('Option type (checkbox, radios, etc.)'),
        label: z.string().describe('Human-readable label'),
        currentValue: z
          .union([z.string(), z.boolean(), z.number(), z.array(z.string())])
          .describe('Current value'),
        choices: z
          .record(z.string(), z.string())
          .optional()
          .describe('Available choices for radios/checkboxes'),
      }),
    )
    .optional()
    .describe('Block options with definitions and current values'),
})

export default defineBlokkliAgentTool({
  name: 'get_block_context',
  description:
    'Get comprehensive context for a single block including parent chain, siblings, children, editable fields, and options. Preferred over multiple individual tool calls.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetBlockContextRunning', 'Getting block context...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
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

    // Get editable fields
    if (params.includeEditableFields) {
      const editables = directive.getEditablesForBlock(params.uuid)
      const editableFields: z.infer<typeof editableFieldSchema>[] = []

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

        editableFields.push({
          fieldName: editable.fieldName,
          fieldType,
          currentValue,
        })
      }

      if (editableFields.length > 0) {
        result.editableFields = editableFields
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
          result.options = availableOptions.map((opt) => {
            const rawValue = getMutatedOptionValue(
              state.mutatedOptions,
              params.uuid,
              opt.property,
              opt.option.default,
            )
            const currentValue = getRuntimeOptionValue(opt.option, rawValue)

            const optionResult: {
              property: string
              type: string
              label: string
              currentValue: string | boolean | number | string[]
              choices?: Record<string, string>
            } = {
              property: opt.property,
              type: opt.option.type,
              label: opt.option.label,
              currentValue,
            }

            // Include choices for radios/checkboxes
            if ('options' in opt.option && opt.option.options) {
              optionResult.choices = opt.option.options as Record<
                string,
                string
              >
            }

            return optionResult
          })
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
