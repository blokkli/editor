import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  parentUuid: z.string().describe('The parent entity UUID'),
  fieldName: z.string().describe('The field name'),
})

const bundleSchema = z.object({
  bundle: z.string().describe('The block type identifier'),
  label: z.string().describe('Human-readable label'),
  description: z
    .string()
    .optional()
    .describe('Bundle description if available'),
  contentFields: z
    .array(
      z.object({
        name: z.string().describe('The field name'),
        type: z
          .string()
          .describe('Field type: plain, markup, reference, or link'),
      }),
    )
    .describe('Content fields (text, media, links) on this bundle'),
  blockFields: z
    .array(
      z.object({
        name: z.string().describe('The field name'),
        label: z.string().describe('Human-readable label'),
        allowedBundles: z
          .array(z.string())
          .describe('Block types allowed in this field'),
        cardinality: z.number().describe('Max blocks allowed (-1 = unlimited)'),
      }),
    )
    .describe('Block fields (for nested blocks) on this bundle'),
})

const resultSchema = z.object({
  fieldLabel: z.string().describe('Human-readable field label'),
  cardinality: z.number().describe('Max blocks allowed (-1 = unlimited)'),
  currentCount: z.number().describe('Current number of blocks in the field'),
  bundles: z.array(bundleSchema).describe('Available block types'),
})

export default defineBlokkliAgentTool({
  name: 'get_bundle_info',
  description:
    'Get detailed information about which block types can be added to a specific field, including their content fields and block fields (for nested blocks).',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) => $t('aiAgentGetBundleInfoRunning', 'Getting bundle info...'),
  paramsSchema,
  resultSchema,
  execute: (ctx, params) => {
    const { fields, types, state, $t } = ctx.app
    const label = $t(
      'aiAgentGetBundleInfoDone',
      'Got bundle info for @field',
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
      const editableConfigs = types.editableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, bundle)
        .filter((c) => c.type !== 'table')
        .map((c) => ({
          name: c.name,
          type: c.type === 'frame' || c.type === 'markup' ? 'markup' : 'plain',
        }))
      const droppableConfigs = types.droppableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, bundle)
        .map((c) => ({
          name: c.name,
          type: c.type,
        }))
      const blockFieldConfigs = types.fieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, bundle)
        .map((c) => ({
          name: c.name,
          label: c.label,
          allowedBundles: c.allowedBundles,
          cardinality: c.cardinality,
        }))
      return {
        bundle,
        label: bundleDefinition?.label ?? bundle,
        description: bundleDefinition?.description,
        contentFields: [...editableConfigs, ...droppableConfigs],
        blockFields: blockFieldConfigs,
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
