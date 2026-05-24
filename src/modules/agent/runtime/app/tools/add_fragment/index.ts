import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { mutationResultSchema, parentSchema, positionSchema } from '../schemas'
import { resolvePosition } from '../helpers'
import { fragmentBlockBundle } from '#blokkli-build/config'

const paramsSchema = z.object({
  name: z.string().describe('The fragment name to add'),
  parent: parentSchema.describe('The parent entity to add the fragment to'),
  position: positionSchema,
})

export default defineBlokkliAgentTool({
  name: 'add_fragment',
  description: 'Add a fragment paragraph to the page.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'added fragment' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentAddFragmentRunning', 'Adding fragment', { more: true })
  },
  paramsSchema,
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['fragmentsAddBlock'],
  execute(ctx, params) {
    const { fields, definitions, permissions } = ctx.app

    // Check add permission for the fragment block bundle
    if (!permissions.checkBlockBundlePermission(fragmentBlockBundle, 'add')) {
      return {
        error: 'Permission denied: cannot add fragment blocks.',
      }
    }

    // Check ancestor restrictions on the target parent
    if (permissions.blockHasRestrictedAncestor(params.parent.uuid)) {
      return {
        error:
          'Permission denied: target parent is inside a block with restricted editing permissions',
      }
    }

    // Check if the fragment exists
    const fragment = definitions.fragmentDefinitions.value.find(
      (f) => f.name === params.name,
    )
    if (!fragment) {
      return { error: `Fragment not found: ${params.name}` }
    }

    // Check if the field exists
    const field = fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }

    // Check if fragments are allowed in this field
    if (!field.allowedFragments.length) {
      return {
        error: `Field "${params.parent.field}" does not allow fragments`,
      }
    }

    // Check if this specific fragment is allowed in this field
    if (!field.allowedFragments.includes(params.name)) {
      const allowedIn = ctx.app.dom.getFieldsAllowingFragment(params.name)

      if (allowedIn.length === 0) {
        return {
          error: `Fragment "${params.name}" is not allowed in any currently registered field.`,
        }
      }

      const locationsList = allowedIn
        .map((f) => `${f.fieldName} on ${f.entity.type} ${f.entity.uuid}`)
        .join(', ')

      return {
        error:
          `Fragment "${params.name}" is not allowed in field "${params.parent.field}". ` +
          `This fragment can be added to: ${locationsList}`,
      }
    }

    const { $t } = ctx.app

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
      label: $t('aiAgentAddFragmentDone', 'Added fragment "@label"').replace(
        '@label',
        fragment.label,
      ),
      apply: (adapter) =>
        adapter.fragmentsAddBlock({
          name: params.name,
          host: {
            type: params.parent.type,
            uuid: params.parent.uuid,
            fieldName: params.parent.field,
          },
          preceedingUuid: resolved.afterUuid,
        }),
    }
  },
})
