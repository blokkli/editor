import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { BlokkliApp } from '#blokkli/editor/types/app'
import { mutationResultSchema } from '../schemas'

const paramsSchema = z.object({
  uuid: z.string().describe('The block UUID containing the field'),
  fieldName: z.string().describe('The field name to update'),
  value: z.string().describe('The new text content'),
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
  name: 'rewrite_text',
  description:
    'Rewrite the text content of a plain or markup content field. Shows a preview immediately and requires user approval.',
  category: 'mutation',
  modes: ['editing', 'translating'],
  label: ($t) => $t('aiAgentRewriteTextRunning', 'Rewriting text...'),
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['updateFieldValue'],
  execute: (ctx, params) => {
    const { blocks, directive } = ctx.app

    const block = blocks.getBlock(params.uuid)
    if (!block) {
      return { error: `Block not found: ${params.uuid}` }
    }

    const fieldType = getFieldType(
      ctx.app,
      ctx.itemEntityType,
      params.uuid,
      params.fieldName,
    )
    if (!fieldType) {
      return { error: `Field not found or not editable: ${params.fieldName}` }
    }

    const element = directive.findEditableElement(params.fieldName, {
      type: ctx.itemEntityType,
      uuid: params.uuid,
      bundle: block.bundle,
    })

    if (!element) {
      return { error: `Element not found for field: ${params.fieldName}` }
    }

    // Store original value for revert
    const originalValue =
      fieldType === 'markup'
        ? element.innerHTML || ''
        : element.textContent || ''

    // Apply the preview immediately in the DOM
    if (fieldType === 'markup') {
      element.innerHTML = params.value
    } else {
      element.textContent = params.value
    }

    const { $t } = ctx.app

    // Return the action for the framework to handle
    return {
      type: 'rewrite' as const,
      label: $t('aiAgentRewriteFieldDone', 'Rewrote @field').replace(
        '@field',
        params.fieldName,
      ),
      apply: (adapter) =>
        adapter.updateFieldValue({
          uuid: params.uuid,
          fieldName: params.fieldName,
          fieldValue: params.value,
        }),
      revert: () => {
        // Restore original value when rejected
        if (fieldType === 'markup') {
          element.innerHTML = originalValue
        } else {
          element.textContent = originalValue
        }
      },
    }
  },
})
