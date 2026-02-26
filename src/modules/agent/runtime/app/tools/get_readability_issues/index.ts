import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import { runReadabilityAnalysis } from '../helpers'

const issueSchema = z.object({
  text: z.string(),
  impact: z.string().optional(),
  scores: z.record(z.string(), z.number()).optional(),
})

const fieldResultSchema = z.object({
  fieldValue: z.string().optional(),
  issues: z.array(issueSchema),
})

const paramsSchema = z.object({})

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
  label($t) {
    return $t('aiAgentAnalyzeContentRunning', 'Analyzing content...')
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
  async execute(ctx) {
    const { $t } = ctx.app

    const result: Result = await runReadabilityAnalysis(
      ctx.app,
      ctx.itemEntityType,
    )

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
