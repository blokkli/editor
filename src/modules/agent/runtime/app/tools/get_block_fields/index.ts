import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID'),
})

const resultSchema = z.array(
  z.object({
    name: z.string().describe('The field name'),
    label: z.string().describe('Human-readable field label'),
    allowedBundles: z
      .array(z.string())
      .describe('Block types allowed in this field'),
    cardinality: z.number().describe('Max blocks allowed (-1 = unlimited)'),
    currentCount: z
      .number()
      .describe('Number of blocks currently in this field'),
  }),
)

export default defineBlokkliMcpTool({
  name: 'get_block_fields',
  description:
    'Get all block reference fields on a block (fields that can contain child blocks)',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('aiAgentGetBlockFieldsRunning', 'Getting block fields...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { blocks, state, types, $t } = ctx.app

    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return {
        label: $t('aiAgentGetBlockFieldsDone', 'Got fields of @bundle').replace(
          '@bundle',
          'unknown',
        ),
        result: [],
      }
    }

    // Get all defined fields for this bundle (includes empty fields)
    const fieldConfigs = types.fieldConfig.forEntityTypeAndBundle(
      ctx.itemEntityType,
      block.bundle,
    )

    // If no field configs found, return informative message
    if (fieldConfigs.length === 0) {
      return {
        label: $t(
          'aiAgentGetBlockFieldsNone',
          '@bundle has no block fields',
        ).replace('@bundle', types.getBlockLabel(block.bundle)),
        result: [],
        affectedUuids: [params.uuid],
      }
    }

    // Get mutated fields data for block counts
    const mutatedFieldsMap = new Map(
      state.mutatedFields.value
        .filter((field) => field.entityUuid === params.uuid)
        .map((field) => [field.name, field.list.length]),
    )

    // Return all defined fields with their current counts
    const results: z.infer<typeof resultSchema> = fieldConfigs.map(
      (fieldConfig) => ({
        name: fieldConfig.name,
        label: fieldConfig.label,
        allowedBundles: fieldConfig.allowedBundles,
        cardinality: fieldConfig.cardinality,
        currentCount: mutatedFieldsMap.get(fieldConfig.name) ?? 0,
      }),
    )

    return {
      label: $t(
        'aiAgentGetBlockFieldsDone',
        'Got fields of @bundle block',
      ).replace('@bundle', types.getBlockLabel(block.bundle)),
      result: results,
      affectedUuids: [params.uuid],
    }
  },
})
