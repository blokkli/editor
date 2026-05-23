import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { runReadabilityAnalysis, resolveHost } from '../helpers'
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

const paramsSchema = z.object({
  template: z
    .enum(['fix_readability', 'translate', 'rewrite', 'generate_content'])
    .describe(
      'The prompt template to use. ' +
        'fix_readability: fix specific flagged readability issues (requires templateParams.issues). ' +
        'translate: translate all fields to a target language (requires templateParams.targetLanguage). ' +
        'rewrite: general-purpose rewrite with a free-form instruction (requires templateParams.instruction). ' +
        'generate_content: write new content for empty fields (requires templateParams.instruction, optional templateParams.context).',
    ),
  templateParams: z
    .record(z.string(), z.unknown())
    .describe(
      'Parameters for the chosen template. ' +
        'fix_readability: {} (no params needed — issues are resolved automatically). ' +
        'translate: { targetLanguage: string }. ' +
        'rewrite: { instruction: string }. ' +
        'generate_content: { instruction: string, context?: string }.',
    ),
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
    'Rewrite, translate, fix readability, or generate text fields with live streaming preview. Choose a template (fix_readability, translate, rewrite, generate_content) and provide the corresponding templateParams. The content will be streamed live into the page for immediate visual feedback.',
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

    let templateParams = params.templateParams

    // For fix_readability, auto-resolve issues from analyzers.
    if (params.template === 'fix_readability') {
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
      template: params.template,
      templateParams,
      fields: resolvedFields,
    }
  },
})
