import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { readBlockContentFields } from '../helpers'

export const paramsSchema = z.object({})

const blockContentSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  bundle: z.string().describe('The paragraph type'),
  text: z
    .string()
    .describe('All text content from this paragraph concatenated'),
  referenceFields: z
    .array(z.string())
    .optional()
    .describe(
      'Names of reference/link content fields on this paragraph (e.g., media fields)',
    ),
})

export const resultSchema = z.object({
  content: z
    .array(blockContentSchema)
    .describe('All paragraphs with their text content, flattened'),
})

export default defineBlokkliAgentTool({
  name: 'get_all_page_content',
  description:
    'Get a flat list of every paragraph on the page with its uuid, bundle, ' +
    'and the concatenated text of its OWN editable fields (does NOT follow ' +
    'references — a teaser appears with empty text). Use this when you need ' +
    'per-block uuids to act on specific blocks (translate, rewrite, delete). ' +
    'For any question about what the page SAYS — summarising, writing an ' +
    'intro that matches the content, translating the page, reviewing meaning ' +
    '— call `get_page_text` instead; it reads the actual rendered DOM (so ' +
    'teaser/referenced content is included) and returns Markdown the LLM can ' +
    'reason about directly.',
  category: 'query',
  lazy: true,
  volatile: true,
  prunedSummary: (r) => `${r.content?.length || 0} paragraphs`,
  modes: ['readonly', 'editing', 'translating', 'review'],
  label($t) {
    return $t('aiAgentGetAllPageContentRunning', 'Getting all page content', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema,
  execute(ctx) {
    const { blocks, state, $t } = ctx.app
    const content: z.infer<typeof blockContentSchema>[] = []

    // Get all blocks from all mutated fields
    function processBlock(blockUuid: string) {
      const block = blocks.getBlock(blockUuid)
      if (!block) return

      // Get all editable text fields for this block
      const textParts: string[] = []

      for (const f of readBlockContentFields(
        ctx.app,
        blockUuid,
        ctx.itemEntityType,
        block.bundle,
      )) {
        if (f.value.trim()) {
          textParts.push(f.value.trim())
        }
      }

      // Look up reference/link content fields for this block's bundle
      const droppableFields = ctx.app.types.droppableFieldConfig
        .forEntityTypeAndBundle(ctx.itemEntityType, block.bundle)
        .map((f) => f.name)

      // Add blocks that have text content or reference fields
      if (textParts.length > 0 || droppableFields.length > 0) {
        content.push({
          uuid: blockUuid,
          bundle: block.bundle,
          text: textParts.join('\n\n'),
          referenceFields: droppableFields.length ? droppableFields : undefined,
        })
      }

      // Process nested children
      const mutatedFields = state.mutatedFields.value
      for (const field of mutatedFields) {
        if (field.entityUuid === blockUuid) {
          for (const child of field.list) {
            processBlock(child.uuid)
          }
        }
      }
    }

    // Start from page-level fields
    const pageUuid = ctx.app.context.value.entityUuid
    const mutatedFields = state.mutatedFields.value
    for (const field of mutatedFields) {
      if (field.entityUuid === pageUuid) {
        for (const item of field.list) {
          processBlock(item.uuid)
        }
      }
    }

    return {
      label: $t(
        'aiAgentGetAllPageContentDone',
        'Got content from @count blocks',
      ).replace('@count', String(content.length)),
      result: {
        content,
      },
    }
  },
})
