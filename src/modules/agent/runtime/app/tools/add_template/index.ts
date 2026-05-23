import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition } from '../helpers'

const paramsSchema = z.object({
  templateUuid: z
    .string()
    .describe(
      'The UUID of the template to add (from search_templates results)',
    ),
  parent: parentSchema.describe('The parent entity to add the template to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'add_template',
  description:
    "Add a template to the page. Templates are copied when added, so changes to the added paragraphs won't affect other pages using the same template. Requires user approval before the template is actually added.",
  category: 'mutation',
  prunedSummary: (r) =>
    r.success
      ? `added template (${r.newParagraphs?.length || 0} paragraphs)`
      : 'rejected',
  lazy: true,
  modes: ['editing'],
  label($t) {
    return $t('aiAgentAddTemplateRunning', 'Adding template', { more: true })
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['templatesAdd'],
  execute(ctx, params) {
    const { fields, $t } = ctx.app

    // Note: template contents (bundles) are only known server-side, so
    // per-bundle add permission checks happen during the adapter call.

    // Check ancestor restrictions on the target parent
    if (ctx.app.permissions.blockHasRestrictedAncestor(params.parent.uuid)) {
      return {
        error:
          'Permission denied: target parent is inside a block with restricted editing permissions',
      }
    }

    // Check if the field exists
    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    // Resolve position to afterUuid
    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

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
          afterUuid: resolved.afterUuid,
        }),
    }
  },
})
