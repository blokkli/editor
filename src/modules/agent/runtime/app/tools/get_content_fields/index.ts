import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  uuids: z
    .array(z.string())
    .describe(
      'One or more paragraph UUIDs (or the page UUID to get page-level fields)',
    ),
  includeNested: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Recursively include content fields from all nested child paragraphs (default: true). Set to false to only get direct fields.',
    ),
})

const fieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('plain').describe('Plain text field'),
    currentValue: z.string().describe('Current field value'),
    required: z.boolean().describe('Whether this field is required'),
    maxLength: z
      .number()
      .describe('Maximum character length (0 means unlimited)'),
  }),
  z.object({
    type: z.literal('markup').describe('Rich text / HTML field'),
    currentValue: z.string().describe('Current field value'),
    required: z.boolean().describe('Whether this field is required'),
    maxLength: z
      .number()
      .describe('Maximum character length (0 means unlimited)'),
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
type ParagraphFields = Record<string, FieldInfo>
type Result = Record<string, ParagraphFields>

const resultSchema = z.record(
  z.string().describe('Paragraph UUID'),
  z.record(z.string().describe('Field name'), fieldSchema),
)

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
    'Get all content fields (text, media, links) for a paragraph and optionally its nested children',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `fields for ${Object.keys(r || {}).length} paragraphs`,
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

      for (const config of editableConfigs) {
        const fieldType =
          config.type === 'frame' || config.type === 'markup'
            ? 'markup'
            : 'plain'

        const currentValue = ctx.app.fieldValue.readValue(
          entityType,
          entityUuid,
          entityBundle,
          config.name,
          fieldType as 'plain' | 'markup',
        )

        addField(result, entityUuid, config.name, {
          type: fieldType as 'plain' | 'markup',
          currentValue,
          required: config.required,
          maxLength: config.maxLength,
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
        const fieldType = ctx.app.fieldValue.resolveFieldType(
          ctx.itemEntityType,
          block.bundle,
          editable.fieldName,
        )
        if (!fieldType) continue

        const currentValue = ctx.app.fieldValue.readValue(
          ctx.itemEntityType,
          blockUuid,
          block.bundle,
          editable.fieldName,
          fieldType,
        )

        const config = types.editableFieldConfig.forName(
          ctx.itemEntityType,
          block.bundle,
          editable.fieldName,
        )

        addField(result, blockUuid, editable.fieldName, {
          type: fieldType,
          currentValue,
          required: config?.required ?? false,
          maxLength: config?.maxLength ?? 0,
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
