import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const paramsSchema = z.object({
  parentUuid: z.string().describe('The parent entity UUID'),
  field: z.string().describe('The field name'),
})

const bundleSchema = z.object({
  bundle: z.string().describe('The paragraph type identifier'),
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
  paragraphFields: z
    .array(
      z.object({
        name: z.string().describe('The field name'),
        label: z.string().describe('Human-readable label'),
        allowedBundles: z
          .array(z.string())
          .describe('Paragraph types allowed in this field'),
        cardinality: z
          .number()
          .describe('Max paragraphs allowed (-1 = unlimited)'),
      }),
    )
    .describe('Paragraph fields (for nested paragraphs) on this bundle'),
})

const resultSchema = z.object({
  fieldLabel: z.string().describe('Human-readable field label'),
  cardinality: z.number().describe('Max paragraphs allowed (-1 = unlimited)'),
  currentCount: z
    .number()
    .describe('Current number of paragraphs in the field'),
  bundles: z.array(bundleSchema).describe('Available paragraph types'),
  nestingInfo: z
    .string()
    .optional()
    .describe(
      'Summary of which bundles have paragraph fields for nested paragraphs. Use get_child_paragraphs after adding these bundles to populate their nested fields.',
    ),
})

export default defineBlokkliAgentTool({
  name: 'get_bundle_info',
  description:
    'Get detailed information about which paragraph types can be added to a specific field, including their content fields and paragraph fields (for nested paragraphs).',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetBundleInfoRunning', 'Getting bundle info...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { fields, types, state, $t } = ctx.app
    const label = $t(
      'aiAgentGetBundleInfoDone',
      'Got bundle info for @field',
    ).replace('@field', params.field)

    const field = fields.find(params.parentUuid, params.field)
    if (!field) {
      return {
        label,
        result: {
          fieldLabel: params.field,
          cardinality: -1,
          currentCount: 0,
          bundles: [],
        },
      }
    }

    // Get field key for counting blocks
    const fieldKey = `${params.parentUuid}:${params.field}`
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
        paragraphFields: blockFieldConfigs,
      }
    })

    const nestingBundles = bundles.filter((b) => b.paragraphFields.length > 0)
    const nestingInfo = nestingBundles.length
      ? nestingBundles
          .map(
            (b) =>
              `${b.bundle} has paragraph fields: ${b.paragraphFields.map((f) => `${f.name} (${f.allowedBundles.join(', ')})`).join(', ')}`,
          )
          .join('; ')
      : undefined

    return {
      label,
      result: {
        fieldLabel: field.label,
        cardinality: field.cardinality,
        currentCount,
        bundles,
        nestingInfo,
      },
    }
  },
})
