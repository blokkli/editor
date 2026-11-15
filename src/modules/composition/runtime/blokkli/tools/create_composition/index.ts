import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import {
  mutationResultSchema,
  parentSchema,
  positionSchema,
} from '#blokkli/agent/app/tools/schemas'
import { resolvePosition } from '#blokkli/agent/app/tools/helpers'
import {
  buildChildren,
  compileOrError,
  findCompositionBundle,
  getChildFieldName,
  toOptionValue,
} from '../composition_helpers'

export default defineBlokkliAgentTool({
  name: 'create_composition',
  description:
    'Add a composition: a bespoke section written as markup (components and HTML elements) followed by <style> blocks. Call get_composition_guide first. Texts in the page language.',
  category: 'mutation',
  prunedSummary: (r) => (r.success ? 'created composition' : 'rejected'),
  modes: ['editing'],
  lazy: true,
  label($t) {
    return $t('aiAgentCreateCompositionRunning', 'Creating composition', {
      more: true,
    })
  },
  paramsSchema: z.object({
    source: z
      .string()
      .describe(
        'The markup, then the <style> blocks. Give the main parts a short, readable id (id="hero").',
      ),
    parent: parentSchema.describe(
      'The parent entity to add the composition to',
    ),
    position: positionSchema,
  }),
  resultSchema: mutationResultSchema,
  requiredAdapterMethods: ['addNewBlocks'],
  async execute(ctx, params) {
    const field = ctx.app.fields.find(params.parent.uuid, params.parent.field)
    if (!field) {
      return {
        error: `Field not found: ${params.parent.field} on entity ${params.parent.uuid}`,
      }
    }
    const bundle = findCompositionBundle(ctx, field.allowedBundles)
    if ('error' in bundle) return bundle

    const result = await compileOrError(params.source)
    if ('error' in result) return result

    // The paragraphs it places: created with it, in its field.
    const fieldName = getChildFieldName(ctx.app, bundle.bundle)
    if (result.compiled.children.length && !fieldName) {
      return {
        error: `This composition can't place paragraphs: its type (${bundle.bundle}) has no field for them.`,
      }
    }
    const built = buildChildren(ctx.app, result.compiled, [])
    if ('error' in built) return built

    const resolved = resolvePosition(
      ctx.app,
      params.parent.uuid,
      params.parent.field,
      params.position,
    )
    if ('error' in resolved) return resolved

    const blockUuid = crypto.randomUUID()
    return {
      type: 'add' as const,
      label: ctx.app.$t('aiAgentCreateCompositionDone', 'Added composition'),
      apply: (adapter) =>
        adapter.addNewBlocks({
          blocks: [
            {
              bundle: bundle.bundle,
              blockUuid,
              options: {
                [bundle.key]: toOptionValue(result.compiled.source),
              },
              ...(fieldName && built.children.length
                ? { children: { [fieldName]: built.children } }
                : {}),
            },
          ],
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
