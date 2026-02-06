import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { BlokkliApp } from '#blokkli/editor/types/app'

const paramsSchema = z.object({})

const blockContentSchema = z.object({
  uuid: z.string().describe('The block UUID'),
  bundle: z.string().describe('The block type'),
  text: z.string().describe('All text content from this block concatenated'),
  referenceFields: z
    .array(z.string())
    .optional()
    .describe(
      'Names of reference/link content fields on this block (e.g., media fields)',
    ),
})

const resultSchema = z.object({
  content: z
    .array(blockContentSchema)
    .describe('All blocks with their text content, flattened'),
})

function getFieldType(
  app: BlokkliApp,
  itemEntityType: string,
  uuid: string,
  fieldName: string,
): 'plain' | 'markup' | null {
  const block = app.blocks.getBlock(uuid)
  if (!block) return null

  const config = app.types.editableFieldConfig.forName(
    itemEntityType,
    block.bundle,
    fieldName,
  )
  if (!config) return null
  if (config.type === 'table') return null
  if (config.type === 'frame' || config.type === 'markup') return 'markup'
  return 'plain'
}

export default defineBlokkliAgentTool({
  name: 'get_all_page_content',
  description:
    'Get all text content from the entire page in a single call. Returns a flat list of all blocks with their concatenated text. Use this as the first tool when reviewing or analyzing page content.',
  category: 'query',
  modes: ['readonly', 'editing', 'translating', 'review'],
  label: ($t) =>
    $t('aiAgentGetAllPageContentRunning', 'Getting all page content...'),
  paramsSchema,
  resultSchema,
  execute: (ctx) => {
    const { blocks, directive, state, $t } = ctx.app
    const content: z.infer<typeof blockContentSchema>[] = []

    // Get all blocks from all mutated fields
    function processBlock(blockUuid: string) {
      const block = blocks.getBlock(blockUuid)
      if (!block) return

      // Get all editable text fields for this block
      const editables = directive.getEditablesForBlock(blockUuid)
      const textParts: string[] = []

      for (const editable of editables) {
        const fieldType = getFieldType(
          ctx.app,
          ctx.itemEntityType,
          blockUuid,
          editable.fieldName,
        )
        if (!fieldType) continue

        let value = ''
        if (editable.getValue) {
          value = editable.getValue()
        } else {
          const element = directive.findEditableElement(editable.fieldName, {
            type: ctx.itemEntityType,
            uuid: blockUuid,
            bundle: block.bundle,
          })
          if (element) {
            // For markup fields, keep the HTML; for plain, get text content
            value =
              fieldType === 'markup'
                ? element.innerHTML || ''
                : element.textContent || ''
          }
        }

        if (value.trim()) {
          textParts.push(value.trim())
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
          referenceFields: droppableFields.length
            ? droppableFields
            : undefined,
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
