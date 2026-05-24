import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { resolveHost } from '../helpers'
import { runReadabilityAnalysis } from '../readability'
import {
  requireBundlePermission,
  requireNoRestrictedAncestor,
} from '../../helpers/validation'
import { onlyUnique } from '#blokkli/helpers'
import { fieldDiffResultSchema } from '../schemas'
import Component from './Component.vue'
import DetailsComponent from '../../components/FieldDiffDetails/index.vue'

const fieldSchema = z.object({
  uuid: z.string().describe('The paragraph UUID'),
  fieldName: z.string().describe('The editable field name'),
})

/**
 * The transform to perform, as a discriminated union on `template`. Each branch
 * declares exactly the parameters its template needs, so the model cannot pair a
 * template with the wrong parameters (e.g. `translate` without `targetLanguage`).
 * The heavy `fix_readability` params (issues, etc.) are resolved server-side in
 * `execute`, so that branch takes no parameters from the model.
 */
const requestSchema = z
  .discriminatedUnion('template', [
    z.object({
      template: z.literal('fix_readability'),
    }),
    z.object({
      template: z.literal('translate'),
      targetLanguage: z
        .string()
        .describe('The language to translate every field into, e.g. "German".'),
    }),
    z.object({
      template: z.literal('rewrite'),
      instruction: z
        .string()
        .describe(
          'Free-form instruction describing how to rewrite the fields.',
        ),
    }),
    z.object({
      template: z.literal('generate_content'),
      instruction: z
        .string()
        .describe('What content to write for the (typically empty) fields.'),
      context: z
        .string()
        .optional()
        .describe(
          'Optional page or topic context to ground the generated content.',
        ),
    }),
  ])
  .describe(
    'The transform to perform. Pick a template and provide its parameters:\n' +
      '- fix_readability: fix flagged readability issues (no extra params — issues are resolved automatically).\n' +
      '- translate: translate all fields into `targetLanguage`.\n' +
      '- rewrite: general-purpose rewrite using `instruction`.\n' +
      '- generate_content: write new content using `instruction` (optional `context`).',
  )

const paramsSchema = z.object({
  request: requestSchema,
  fields: z
    .array(fieldSchema)
    .describe('The fields to transform (UUIDs and field names only)'),
})

export type StreamTextFieldsParams = z.infer<typeof paramsSchema>
export type StreamTextFieldsResult = z.infer<typeof fieldDiffResultSchema>

export type ResolvedField = {
  uuid: string
  fieldName: string
  currentValue: string
  fieldType: 'plain' | 'markup'
  entityType: string
  entityBundle: string
}

export type ComponentParams = {
  template: string
  templateParams: Record<string, unknown>
  fields: ResolvedField[]
}

export default defineBlokkliAgentTool({
  name: 'delegate_text_rewrite',
  description:
    'Rewrite, translate, fix readability, or generate text fields with live streaming preview. Set `request` to the chosen template and its parameters (see the request field). The content will be streamed live into the page for immediate visual feedback.',
  category: 'mutation',
  lazy: true,
  modes: ['editing', 'translating'],
  prunedSummary: (r) =>
    `${r.acceptedCount || 0} accepted, ${Object.keys(r.rejectedByUser || {}).length} rejected`,
  label($t) {
    return $t('aiAgentDelegateRewriteRunning', 'Rewriting texts', {
      more: true,
    })
  },
  paramsSchema,
  resultSchema: fieldDiffResultSchema,
  requiredAdapterMethods: ['updateFieldValueBatched'],
  component: Component,
  detailsComponent: DetailsComponent,
  buildDetails: (result) => result,
  async execute(ctx, params) {
    const { blocks, context } = ctx.app

    // Check edit permission for all block bundles
    const bundles = params.fields
      .map((f) => blocks.getBlock(f.uuid)?.bundle)
      .filter((b): b is string => !!b)
      .filter(onlyUnique)

    if (bundles.length) {
      const denied = requireBundlePermission(ctx.app, bundles, 'edit')
      if (denied) return denied
    }

    // Check ancestor restrictions
    const blockUuids = params.fields
      .map((f) => f.uuid)
      .filter((uuid) => uuid !== context.value.entityUuid)
      .filter(onlyUnique)
    if (blockUuids.length) {
      const ancestorDenied = requireNoRestrictedAncestor(ctx.app, blockUuids)
      if (ancestorDenied) return ancestorDenied
    }

    const resolvedFields: ResolvedField[] = []

    for (const { uuid, fieldName } of params.fields) {
      const host = resolveHost(ctx.app, uuid)
      if (!host) continue
      const { entityType, bundle } = host

      const fieldType = ctx.app.fieldValue.resolveFieldType(
        entityType,
        bundle,
        fieldName,
      )
      if (!fieldType) continue

      const currentValue = ctx.app.fieldValue.readValue(
        entityType,
        uuid,
        bundle,
        fieldName,
        fieldType,
      )

      resolvedFields.push({
        uuid,
        fieldName,
        currentValue,
        fieldType,
        entityType,
        entityBundle: bundle,
      })
    }

    // The model picks a template + its params via the discriminated `request`.
    // Downstream (Component, stream, templates) consumes the legacy
    // `{ template, templateParams }` shape, so split the discriminant from its
    // inline params here.
    const { template, ...inlineParams } = params.request
    let templateParams: Record<string, unknown> = inlineParams

    // For fix_readability, auto-resolve issues from analyzers.
    if (template === 'fix_readability') {
      if (!ctx.app.readability.isAvailable.value) {
        return {
          error:
            'Readability analyzer is not configured for this project. The fix_readability template requires it.',
        }
      }
      const analysisResult = await runReadabilityAnalysis(ctx.app)

      const issues: {
        fieldIndex: number
        text: string
        impact: string
        score: number
      }[] = []

      for (let i = 0; i < resolvedFields.length; i++) {
        const field = resolvedFields[i]!
        const fieldIssues =
          analysisResult[field.uuid]?.[field.fieldName]?.issues
        if (!fieldIssues) continue

        for (const issue of fieldIssues) {
          issues.push({
            fieldIndex: i,
            text: issue.text,
            impact: issue.impact || 'moderate',
            score: issue.score ?? 0,
          })
        }
      }

      templateParams = {
        issues,
        scoreLabel: ctx.app.readability.scoreLabel.value,
        scoreReference: ctx.app.readability.getAgentContext(),
      }
    }

    return {
      template,
      templateParams,
      fields: resolvedFields,
    }
  },
})
