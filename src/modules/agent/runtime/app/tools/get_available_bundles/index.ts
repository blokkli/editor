import { z } from 'zod'
import { defineBlokkliMcpTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  parentUuid: z.string().describe('The parent entity UUID'),
  fieldName: z.string().describe('The field name'),
})

const bundleSchema = z.object({
  bundle: z.string().describe('The block type identifier'),
  label: z.string().describe('Human-readable label'),
  editableFields: z.array(z.string()).describe('Names of editable text fields'),
})

const resultSchema = z.object({
  fieldLabel: z.string().describe('Human-readable field label'),
  cardinality: z.number().describe('Max blocks allowed (-1 = unlimited)'),
  currentCount: z.number().describe('Current number of blocks in the field'),
  bundles: z.array(bundleSchema).describe('Available block types'),
})

export default defineBlokkliMcpTool({
  name: 'get_available_bundles',
  description: 'Get the block types that can be added to a specific field',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetAvailableBundlesRunning', 'Getting available bundles...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { fields, types, state, $t } = ctx.app
    const label = $t(
      'aiAgentGetAvailableBundlesDone',
      'Got available bundles for @field',
    ).replace('@field', params.fieldName)

    const field = fields.find(params.parentUuid, params.fieldName)
    if (!field) {
      return {
        label,
        result: {
          fieldLabel: params.fieldName,
          cardinality: -1,
          currentCount: 0,
          bundles: [],
        },
      }
    }

    // Get field key for counting blocks
    const fieldKey = `${params.parentUuid}:${params.fieldName}`
    const currentCount = state.getFieldBlockCount(fieldKey)

    const bundles = field.allowedBundles.map((bundle) => {
      const bundleDefinition = types.getBlockBundleDefinition(bundle)
      const editableConfigs = types.editableFieldConfig.forEntityTypeAndBundle(
        ctx.itemEntityType,
        bundle,
      )
      return {
        bundle,
        label: bundleDefinition?.label ?? bundle,
        editableFields: editableConfigs.map((c) => c.name),
      }
    })

    return {
      label,
      result: {
        fieldLabel: field.label,
        cardinality: field.cardinality,
        currentCount,
        bundles,
      },
    }
  },
})
