import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { parentSchema } from '../schemas'
import { fromLibraryBlockBundle, itemEntityType } from '#blokkli-build/config'

const paramsSchema = z.object({
  parent: parentSchema
    .optional()
    .describe(
      'The parent entity where a reusable paragraph would be added. When provided, results are filtered to only include bundles allowed in this field.',
    ),
})

const reusableParagraphSchema = z.object({
  uuid: z.string().describe('The unique UUID of the reusable paragraph'),
  label: z.string().describe('The display label'),
  bundle: z
    .string()
    .describe('The paragraph bundle type of the reusable paragraph'),
})

const resultSchema = z.object({
  items: z
    .array(reusableParagraphSchema)
    .describe('Matching reusable paragraphs'),
  total: z.number().describe('Total number of matching reusable paragraphs'),
})

export default defineBlokkliAgentTool({
  name: 'search_reusable_paragraphs',
  description:
    'Search for reusable paragraphs. These are pre-built paragraphs that can be placed on multiple pages. Unlike templates, reusable paragraphs stay linked: editing the reusable paragraph updates all pages using it. Use add_reusable_paragraph to add a result to the page.',
  category: 'query',
  prunedSummary: (r) => `found ${r.total} reusable paragraphs`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentSearchLibraryRunning', 'Searching reusable blocks...')
  },
  paramsSchema,
  resultSchema,
  requiredAdapterMethods: ['getLibraryItems'],
  async execute(ctx, params) {
    const { types, context, blocks, $t } = ctx.app

    // Determine which bundles to filter by.
    let bundles: string[] = []

    if (params.parent) {
      const isRootEntity = params.parent.uuid === context.value.entityUuid
      const parentEntityType = isRootEntity
        ? context.value.entityType
        : itemEntityType
      const parentBundle = isRootEntity
        ? context.value.entityBundle
        : blocks.getBlock(params.parent.uuid)?.bundle

      if (!parentBundle) {
        return { error: `Parent not found: ${params.parent.uuid}` }
      }

      const field = types.getFieldConfig(
        parentEntityType,
        parentBundle,
        params.parent.field,
      )

      if (!field) {
        return {
          error: `Field "${params.parent.field}" not found on bundle "${parentBundle}".`,
        }
      }

      // The field must allow the from_library bundle for reusable blocks.
      if (
        field.allowedBundles.length &&
        !field.allowedBundles.includes(fromLibraryBlockBundle)
      ) {
        return {
          error: `Field "${params.parent.field}" does not allow the from_library bundle.`,
        }
      }

      // Filter to bundles allowed in this field (excluding from_library itself).
      bundles = field.allowedBundles.filter((b) => b !== fromLibraryBlockBundle)
    }

    const apiResult = await ctx.adapter.getLibraryItems!({
      bundles,
      page: 0,
      filters: {},
    })

    const result = {
      items: apiResult.items.map((item) => ({
        uuid: item.uuid,
        label: item.label || '',
        bundle: item.bundle,
      })),
      total: apiResult.total,
    }

    const label = $t('aiAgentSearchLibraryDone', 'Searched library')

    return { label, result }
  },
})
