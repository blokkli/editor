import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { getAvailableOptions } from '#blokkli/editor/helpers/options'
import { getRuntimeOptionValue } from '#blokkli/runtime-helpers'
import { blockOptionsMapSchema } from '../schemas'
import type { BlockOptionsMap } from '../schemas'
import { extractOptionLabels } from '../helpers'
import type { BlockBundleWithNested } from '#blokkli-build/generated-types'

const paramsSchema = z.object({
  parentUuid: z.string().describe('The parent entity UUID'),
  field: z.string().describe('The field name'),
  bundles: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of bundle names to filter by. If omitted, returns all allowed bundles.',
    ),
})

const bundleSchema = z.object({
  bundle: z.string().describe('The paragraph type identifier'),
  label: z.string().describe('Human-readable label'),
  description: z
    .string()
    .optional()
    .describe('Bundle description if available'),
  contentFields: z
    .record(
      z.string(),
      z.object({
        type: z
          .string()
          .describe('Field type: plain, markup, reference, or link'),
      }),
    )
    .describe(
      'Content fields (text, media, links) on this bundle, keyed by field name',
    ),
  paragraphFields: z
    .record(
      z.string(),
      z.object({
        label: z.string().describe('Human-readable label'),
        allowedBundles: z
          .array(z.string())
          .describe('Paragraph types allowed in this field'),
        cardinality: z
          .number()
          .describe('Max paragraphs allowed (-1 = unlimited)'),
      }),
    )
    .describe(
      'Paragraph fields (for nested paragraphs) on this bundle, keyed by field name',
    ),
  options: blockOptionsMapSchema
    .optional()
    .describe(
      'Available options for this bundle with their default values (only included when few bundles are returned)',
    ),
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
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetBundleInfoRunning', 'Getting bundle info...')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { fields, types, state, definitions, $t, context, blocks } = ctx.app
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

    const allowedBundles = params.bundles
      ? field.allowedBundles.filter((b) => params.bundles!.includes(b))
      : field.allowedBundles

    const includeOptions = allowedBundles.length < 3
    const parentBundle: BlockBundleWithNested | null =
      params.parentUuid === context.value.entityUuid
        ? null
        : ((blocks.getBlock(params.parentUuid)
            ?.bundle as BlockBundleWithNested) ?? null)

    const bundles = allowedBundles.map((bundle) => {
      const bundleDefinition = types.getBlockBundleDefinition(bundle)
      const contentFields: Record<string, { type: string }> = {}
      for (const c of types.editableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, bundle)
        .filter((c) => c.type !== 'table')) {
        contentFields[c.name] = {
          type: c.type === 'frame' || c.type === 'markup' ? 'markup' : 'plain',
        }
      }
      for (const c of types.droppableFieldConfig.forEntityTypeAndBundle(
        ctx.itemEntityType,
        bundle,
      )) {
        contentFields[c.name] = { type: c.type }
      }

      const paragraphFields: Record<
        string,
        { label: string; allowedBundles: string[]; cardinality: number }
      > = {}
      for (const c of types.fieldConfig.forEntityTypeAndBundle(
        ctx.itemEntityType,
        bundle,
      )) {
        paragraphFields[c.name] = {
          label: c.label,
          allowedBundles: c.allowedBundles,
          cardinality: c.cardinality,
        }
      }

      let options: BlockOptionsMap | undefined
      if (includeOptions) {
        const definition = definitions.getBlockDefinition(
          bundle,
          'default',
          parentBundle,
        )
        if (definition) {
          const availableOptions = getAvailableOptions(
            definition.options,
            definition.globalOptions as string[] | undefined,
            definitions.globalOptions.value as Record<string, any>,
          )
          if (availableOptions.length > 0) {
            options = {}
            for (const opt of availableOptions) {
              const resolvedValue = getRuntimeOptionValue(
                opt.option,
                opt.option.default,
              )
              const entry: BlockOptionsMap[string] = {
                type: opt.option.type,
                label: opt.option.label,
                currentValue: resolvedValue ?? '',
              }
              if (opt.option.description) {
                entry.description = opt.option.description
              }
              const labels = extractOptionLabels(opt.option)
              if (labels) {
                entry.options = labels
              }
              const optMin = (opt.option as { min?: unknown }).min
              const optMax = (opt.option as { max?: unknown }).max
              if (typeof optMin === 'number') {
                entry.min = optMin
              }
              if (typeof optMax === 'number') {
                entry.max = optMax
              }
              if ('step' in opt.option && opt.option.type === 'range') {
                entry.step = opt.option.step
              }
              options[opt.property] = entry
            }
          }
        }
      }

      return {
        bundle,
        label: bundleDefinition?.label ?? bundle,
        description: bundleDefinition?.description,
        contentFields,
        paragraphFields,
        options,
      }
    })

    const nestingBundles = bundles.filter(
      (b) => Object.keys(b.paragraphFields).length > 0,
    )
    const nestingInfo = nestingBundles.length
      ? nestingBundles
          .map(
            (b) =>
              `${b.bundle} has paragraph fields: ${Object.entries(
                b.paragraphFields,
              )
                .map(([name, f]) => `${name} (${f.allowedBundles.join(', ')})`)
                .join(', ')}`,
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
