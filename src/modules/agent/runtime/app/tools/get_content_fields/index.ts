import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { BlokkliApp } from '#blokkli/editor/types/app'

const paramsSchema = z.object({
  uuid: z
    .string()
    .describe('The block UUID or entity UUID (to get entity-level fields)'),
  includeNested: z
    .boolean()
    .optional()
    .describe('Whether to include fields from nested child blocks'),
})

const contentFieldSchema = z.discriminatedUnion('type', [
  z.object({
    uuid: z.string().describe('The block UUID containing this field'),
    bundle: z.string().describe('The block type'),
    fieldName: z.string().describe('The field name'),
    type: z.literal('plain').describe('Plain text field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    uuid: z.string().describe('The block UUID containing this field'),
    bundle: z.string().describe('The block type'),
    fieldName: z.string().describe('The field name'),
    type: z.literal('markup').describe('Rich text / HTML field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    uuid: z.string().describe('The block UUID containing this field'),
    bundle: z.string().describe('The block type'),
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
    uuid: z.string().describe('The block UUID containing this field'),
    bundle: z.string().describe('The block type'),
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
  contentFields: z.array(contentFieldSchema),
})

function getFieldType(
  app: BlokkliApp,
  entityType: string,
  bundle: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const config = app.types.editableFieldConfig.forName(
    entityType,
    bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

export default defineBlokkliAgentTool({
  name: 'get_content_fields',
  description:
    'Get all content fields (text, media, links) for a block and optionally its nested children',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetContentFieldsRunning', 'Getting content fields...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, directive, state, types, $t, context } = ctx.app
    const contentFields: z.infer<typeof contentFieldSchema>[] = []

    // Check if this is the entity UUID.
    const isEntity = params.uuid === context.value.entityUuid

    const rootBlock = blocks.getBlock(params.uuid)
    const bundleLabel = isEntity
      ? context.value.entityBundle
      : rootBlock
        ? types.getBlockLabel(rootBlock.bundle)
        : 'unknown'

    function processEntity(entityUuid: string) {
      const entityType = context.value.entityType
      const entityBundle = context.value.entityBundle

      // Get editable text fields from config (not from directives, since
      // entity editables may not be registered via getEditablesForBlock).
      const editableConfigs = types.editableFieldConfig
        .forEntityTypeAndBundle(entityType, entityBundle)
        .filter((f) => f.type !== 'table')

      // Build a lookup of directive-registered editables for getValue().
      const editableMap = new Map(
        directive.getEditablesForBlock(entityUuid).map((e) => [e.fieldName, e]),
      )

      for (const config of editableConfigs) {
        const fieldType =
          config.type === 'frame' || config.type === 'markup'
            ? 'markup'
            : 'plain'

        let currentValue = ''
        const registered = editableMap.get(config.name)
        if (registered?.getValue) {
          currentValue = registered.getValue()
        } else {
          const element = directive.findEditableElement(config.name, {
            type: entityType,
            uuid: entityUuid,
            bundle: entityBundle,
          })
          if (element) {
            currentValue =
              fieldType === 'markup'
                ? element.innerHTML || ''
                : element.textContent || ''
          }
        }

        contentFields.push({
          uuid: entityUuid,
          bundle: entityBundle,
          fieldName: config.name,
          type: fieldType as 'plain' | 'markup',
          currentValue,
        })
      }

      // Get droppable fields (reference and link) for entity
      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          entityType,
          entityBundle,
        )
      for (const config of droppableConfigs) {
        contentFields.push({
          uuid: entityUuid,
          bundle: entityBundle,
          fieldName: config.name,
          label: config.label,
          type: config.type as 'reference' | 'link',
          allowed: config.allowed,
        })
      }
    }

    function processBlock(blockUuid: string) {
      const block = blocks.getBlock(blockUuid)
      if (!block) return

      // Get editable text fields
      const editables = directive.getEditablesForBlock(blockUuid)
      for (const editable of editables) {
        const fieldType = getFieldType(
          ctx.app,
          ctx.itemEntityType,
          block.bundle,
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

        contentFields.push({
          uuid: blockUuid,
          bundle: block.bundle,
          fieldName: editable.fieldName,
          type: fieldType,
          currentValue,
        })
      }

      // Get droppable fields (reference and link)
      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          ctx.itemEntityType,
          block.bundle,
        )
      for (const config of droppableConfigs) {
        contentFields.push({
          uuid: blockUuid,
          bundle: block.bundle,
          fieldName: config.name,
          label: config.label,
          type: config.type as 'reference' | 'link',
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

    if (isEntity) {
      processEntity(params.uuid)
    } else {
      processBlock(params.uuid)
    }

    return {
      label: isEntity
        ? $t(
            'aiAgentGetEntityContentFieldsDone',
            'Got content fields of page entity',
          )
        : $t(
            'aiAgentGetContentFieldsDone',
            'Got content fields of @bundle block',
          ).replace('@bundle', bundleLabel),
      result: {
        contentFields,
      },
      affectedUuids: [params.uuid],
    }
  },
})
