import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { BlokkliApp } from '#blokkli/editor/types/app'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  includeNested: z
    .boolean()
    .optional()
    .describe('Whether to include fields from nested child blocks'),
})

const editableFieldSchema = z.object({
  uuid: z.string().describe('The block UUID containing this field'),
  bundle: z.string().describe('The block type'),
  fieldName: z.string().describe('The field name'),
  fieldType: z
    .enum(['plain', 'markup'])
    .describe('Whether field accepts HTML or plain text'),
  currentValue: z.string().describe('Current field value'),
})

const droppableFieldSchema = z.object({
  uuid: z.string().describe('The block UUID containing this field'),
  bundle: z.string().describe('The block type'),
  fieldName: z.string().describe('The droppable field name'),
  label: z.string().describe('Human-readable field label'),
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
})

const resultSchema = z.object({
  editableFields: z.array(editableFieldSchema),
  droppableFields: z.array(droppableFieldSchema),
})

function getFieldType(
  app: BlokkliApp,
  itemEntityType: string,
  uuid: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const block = app.blocks.getBlock(uuid)
  if (!block) return null

  const config = app.types.editableFieldConfig.forName(
    itemEntityType,
    block.bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

export default defineBlokkliAgentTool({
  name: 'get_editable_fields',
  description:
    'Get all editable text fields and droppable media fields for a block and optionally its nested children',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetEditableFieldsRunning', 'Getting editable fields...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, directive, state, types, $t } = ctx.app
    const editableResults: z.infer<typeof editableFieldSchema>[] = []
    const droppableResults: z.infer<typeof droppableFieldSchema>[] = []

    const rootBlock = blocks.getBlock(params.uuid)
    const bundleLabel = rootBlock
      ? types.getBlockLabel(rootBlock.bundle)
      : 'unknown'

    function processBlock(blockUuid: string) {
      const block = blocks.getBlock(blockUuid)
      if (!block) return

      // Get editable text fields
      const editables = directive.getEditablesForBlock(blockUuid)
      for (const editable of editables) {
        const fieldType = getFieldType(
          ctx.app,
          ctx.itemEntityType,
          blockUuid,
          editable.fieldName,
        )
        if (!fieldType) continue

        let currentValue = ''
        if (editable.getValue) {
          currentValue = editable.getValue()
        } else {
          const element = directive.findEditableElement(editable.fieldName, {
            type: ctx.itemEntityType,
            uuid: blockUuid,
            bundle: block.bundle,
          })
          if (element) {
            currentValue =
              fieldType === 'markup'
                ? element.innerHTML || ''
                : element.textContent || ''
          }
        }

        editableResults.push({
          uuid: blockUuid,
          bundle: block.bundle,
          fieldName: editable.fieldName,
          fieldType,
          currentValue,
        })
      }

      // Get droppable media fields
      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          ctx.itemEntityType,
          block.bundle,
        )
      for (const config of droppableConfigs) {
        droppableResults.push({
          uuid: blockUuid,
          bundle: block.bundle,
          fieldName: config.name,
          label: config.label,
          allowed: config.allowed,
        })
      }

      // Process nested children if requested
      if (params.includeNested) {
        const mutatedFields = state.mutatedFields.value
        for (const field of mutatedFields) {
          if (field.entityUuid === blockUuid) {
            for (const child of field.list) {
              processBlock(child.uuid)
            }
          }
        }
      }
    }

    processBlock(params.uuid)

    return {
      label: $t(
        'aiAgentGetEditableFieldsDone',
        'Got editable fields of @bundle block',
      ).replace('@bundle', bundleLabel),
      result: {
        editableFields: editableResults,
        droppableFields: droppableResults,
      },
      affectedUuids: [params.uuid],
    }
  },
})
