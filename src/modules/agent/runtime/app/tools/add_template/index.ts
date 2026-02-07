import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema } from '../schemas'

const paramsSchema = z.object({
  templateUuid: z
    .string()
    .describe(
      'The UUID of the template to add (from search_templates results)',
    ),
  parent: parentSchema.describe('The parent entity to add the template to'),
  afterUuid: z
    .string()
    .nullable()
    .optional()
    .describe('UUID of block to insert after, or null for beginning'),
})

export default defineBlokkliAgentTool({
  name: 'add_template',
  description:
    "Add a template to the page. Templates are copied when added, so changes to the added blocks won't affect other pages using the same template. Requires user approval before the template is actually added.",
  category: 'mutation',
  prunedSummary: (r) =>
    r.success
      ? `added template (${r.newBlocks?.length || 0} blocks)`
      : 'rejected',
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentAddTemplateRunning', 'Adding template...')
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['templatesAdd'],
  execute(ctx, params) {
    const { fields, $t } = ctx.app

    // Check if the field exists
    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    return {
      type: 'add' as const,
      label: $t('aiAgentAddTemplateDone', 'Added template'),
      apply: (adapter) =>
        adapter.templatesAdd({
          templateUuid: params.templateUuid,
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          afterUuid: params.afterUuid ?? null,
        }),
    }
  },
})
