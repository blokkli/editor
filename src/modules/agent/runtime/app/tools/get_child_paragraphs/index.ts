import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema } from '../schemas'

export const paramsSchema = z.object({
  uuid: z
    .string()
    .optional()
    .describe(
      'Paragraph UUID to get children for. If not provided, returns page-level paragraphs.',
    ),
})

const paragraphSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
})

const fieldWithParagraphsSchema = z.object({
  label: z.string().describe('Human-readable field label'),
  cardinality: z.number().describe('Max paragraphs allowed (-1 = unlimited)'),
  parent: parentSchema.describe(
    'Parent object to use when adding paragraphs to this field',
  ),
  paragraphs: z.array(paragraphSchema).describe('Paragraphs in this field'),
})

export const resultSchema = z.object({
  parentBundle: z
    .string()
    .describe('The bundle type of the parent (page or paragraph)'),
  fields: z
    .record(z.string().describe('Field name'), fieldWithParagraphsSchema)
    .describe('Fields keyed by name, each with parent object and paragraphs'),
})

export default defineBlokkliAgentTool({
  name: 'get_child_paragraphs',
  description:
    'Get all child fields and paragraphs for the page or a paragraph. Returns parent objects ready for use with add_paragraphs. Use this to understand structure before adding paragraphs.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => {
    const fieldCount = Object.keys(r.fields).length
    const paragraphCount = Object.values(r.fields).reduce(
      (s, f) => s + f.paragraphs.length,
      0,
    )
    return `${paragraphCount} paragraphs across ${fieldCount} fields`
  },
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetChildBlocks', 'Get child blocks')
  },
  paramsSchema,
  resultSchema,
  execute(ctx, params) {
    const { context, state, $t, blocks, types } = ctx.app

    // Use provided UUID or fall back to page entity
    const parentUuid = params.uuid || context.value.entityUuid
    const isPage = !params.uuid

    // Get parent info
    let parentBundle: string
    let parentEntityType: string
    if (isPage) {
      parentBundle = context.value.entityBundle
      parentEntityType = context.value.entityType
    } else {
      const block = blocks.getBlock(parentUuid)
      if (!block) {
        return {
          label: $t('aiAgentBlockNotFound', 'Block not found'),
          result: { parentBundle: 'unknown', fields: {} },
        }
      }
      parentBundle = block.bundle
      parentEntityType = ctx.itemEntityType
    }

    // Get all defined fields for this bundle (includes empty fields)
    const fieldConfigs = types.fieldConfig.forEntityTypeAndBundle(
      parentEntityType,
      parentBundle,
    )

    // If no field configs found for a block (not page), return informative message
    if (fieldConfigs.length === 0 && !isPage && params.uuid) {
      return {
        label: $t(
          'aiAgentGetChildBlocksNone',
          '@bundle has no child fields',
        ).replace('@bundle', types.getBlockLabel(parentBundle)),
        result: { parentBundle, fields: {} },
        affectedUuids: [params.uuid],
      }
    }

    // Get mutated fields data for blocks
    const mutatedFieldsMap = new Map(
      state.mutatedFields.value
        .filter((field) => field.entityUuid === parentUuid)
        .map((field) => [field.name, field.list]),
    )

    // Return all defined fields, with blocks from mutated state
    const fields: Record<
      string,
      {
        label: string
        cardinality: number
        parent: { type: string; uuid: string; field: string }
        paragraphs: { uuid: string; bundle: string }[]
      }
    > = {}
    for (const fieldConfig of fieldConfigs) {
      const blockList = mutatedFieldsMap.get(fieldConfig.name) || []
      fields[fieldConfig.name] = {
        label: fieldConfig.label,
        cardinality: fieldConfig.cardinality,
        parent: {
          type: parentEntityType,
          uuid: parentUuid,
          field: fieldConfig.name,
        },
        paragraphs: blockList.map((item) => ({
          uuid: item.uuid,
          bundle: item.bundle,
        })),
      }
    }

    const bundleLabel = isPage
      ? context.value.entityBundle
      : types.getBlockLabel(parentBundle)

    return {
      label: $t('aiAgentGetChildBlocksDone', 'Got children of @bundle').replace(
        '@bundle',
        bundleLabel,
      ),
      result: { parentBundle, fields },
      affectedUuids: params.uuid ? [params.uuid] : undefined,
    }
  },
})
