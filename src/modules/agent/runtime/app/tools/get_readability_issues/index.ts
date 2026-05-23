import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { runReadabilityAnalysis } from '../helpers'

const issueSchema = z.object({
  text: z.string(),
  impact: z.string().optional(),
  score: z.number().optional(),
})

const fieldResultSchema = z.object({
  fieldValue: z.string().optional(),
  issues: z.array(issueSchema),
})

const paramsSchema = z.object({
  uuids: z
    .array(z.string())
    .optional()
    .describe(
      'Optional list of paragraph UUIDs to return results for. If omitted, returns results for all paragraphs.',
    ),
})

const resultSchema = z.record(
  z.string(),
  z.record(z.string(), fieldResultSchema),
)

type Result = z.infer<typeof resultSchema>

export default defineBlokkliAgentTool({
  name: 'get_readability_issues',
  description:
    'Run all readability analyzers against the full page. Returns an object keyed by paragraph UUID and field name, with the current field value and a list of issues. Each issue contains the flagged text segment, impact, and scores. Use the result to call update_text_fields directly.',
  category: 'query',
  volatile: true,
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  requiredAdapterMethods: ['getAnalyzers'],
  isAvailable: (app) => app.readability.isAvailable.value,
  label($t) {
    return $t('aiAgentAnalyzeContentRunning', 'Analyzing content', {
      more: true,
    })
  },
  prunedSummary: (r) => {
    let count = 0
    for (const fields of Object.values(r)) {
      for (const field of Object.values(fields)) {
        count += field.issues.length
      }
    }
    return `found ${count} issues`
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { $t } = ctx.app

    const allResults: Result = await runReadabilityAnalysis(ctx.app)

    const result: Result = params.uuids
      ? Object.fromEntries(
          Object.entries(allResults).filter(([uuid]) =>
            params.uuids!.some(
              (selected) =>
                selected === uuid || ctx.app.state.isChildOf(uuid, selected),
            ),
          ),
        )
      : allResults

    let issueCount = 0
    for (const fields of Object.values(result)) {
      for (const field of Object.values(fields)) {
        issueCount += field.issues.length
      }
    }

    return {
      label: $t('aiAgentAnalyzeContentDone', 'Analyzed @count results').replace(
        '@count',
        String(issueCount),
      ),
      result,
    }
  },
})
