import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { BlokkliApp } from '#blokkli/editor/types/app'

const paramsSchema = z.object({
  uuids: z
    .array(z.string())
    .describe(
      'One or more block UUIDs (or the page UUID to get page-level fields)',
    ),
  includeNested: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Recursively include content fields from all nested child blocks (default: true). Set to false to only get direct fields.',
    ),
})

const fieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('plain').describe('Plain text field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    type: z.literal('markup').describe('Rich text / HTML field'),
    currentValue: z.string().describe('Current field value'),
  }),
  z.object({
    type: z.literal('reference').describe('Entity reference field'),
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
  }),
  z.object({
    type: z.literal('link').describe('Link field'),
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
  }),
])

type FieldInfo = z.infer<typeof fieldSchema>
type BlockFields = Record<string, FieldInfo>
type Result = Record<string, BlockFields>

const resultSchema = z.record(
  z.string().describe('Block UUID'),
  z.record(z.string().describe('Field name'), fieldSchema),
)

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

function addField(
  result: Result,
  uuid: string,
  fieldName: string,
  field: FieldInfo,
) {
  if (!result[uuid]) {
    result[uuid] = {}
  }
  result[uuid][fieldName] = field
}

export default defineBlokkliAgentTool({
  name: 'get_content_fields',
  description:
    'Get all content fields (text, media, links) for a block and optionally its nested children',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetContentFieldsRunning', 'Getting content fields...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { blocks, directive, state, types, $t, context } = ctx.app
    const result: Result = {}
    const processedUuids = new Set<string>()

    function processEntity(entityUuid: string) {
      const entityType = context.value.entityType
      const entityBundle = context.value.entityBundle

      const editableConfigs = types.editableFieldConfig
        .forEntityTypeAndBundle(entityType, entityBundle)
        .filter((f) => f.type !== 'table')

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

        addField(result, entityUuid, config.name, {
          type: fieldType as 'plain' | 'markup',
          currentValue,
        })
      }

      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          entityType,
          entityBundle,
        )
      for (const config of droppableConfigs) {
        addField(result, entityUuid, config.name, {
          type: config.type as 'reference' | 'link',
          label: config.label,
          allowed: config.allowed,
        })
      }
    }

    function processBlock(blockUuid: string) {
      if (processedUuids.has(blockUuid)) return
      processedUuids.add(blockUuid)

      const block = blocks.getBlock(blockUuid)
      if (!block) return

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

        addField(result, blockUuid, editable.fieldName, {
          type: fieldType,
          currentValue,
        })
      }

      const droppableConfigs =
        types.droppableFieldConfig.forEntityTypeAndBundle(
          ctx.itemEntityType,
          block.bundle,
        )
      for (const config of droppableConfigs) {
        addField(result, blockUuid, config.name, {
          type: config.type as 'reference' | 'link',
          label: config.label,
          allowed: config.allowed,
        })
      }

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

    let hasEntity = false
    for (const uuid of params.uuids) {
      if (uuid === context.value.entityUuid) {
        hasEntity = true
        processEntity(uuid)
      } else {
        processBlock(uuid)
      }
    }

    const count = params.uuids.length
    const label =
      hasEntity && count === 1
        ? $t(
            'aiAgentGetEntityContentFieldsDone',
            'Got content fields of page entity',
          )
        : count === 1
          ? $t(
              'aiAgentGetContentFieldsDone',
              'Got content fields of @bundle block',
            ).replace(
              '@bundle',
              types.getBlockLabel(
                blocks.getBlock(params.uuids[0]!)?.bundle || 'unknown',
              ),
            )
          : $t(
              'aiAgentGetContentFieldsMultipleDone',
              'Got content fields of @count blocks',
            ).replace('@count', String(count))

    return {
      label,
      result,
      affectedUuids: params.uuids,
    }
  },
})
