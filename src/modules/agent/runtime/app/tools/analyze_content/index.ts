import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

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

/**
 * Resolve a target HTMLElement to its paragraph UUID, editable field name,
 * and the full text of the editable field.
 */
function resolveTargetInfo(target: HTMLElement): {
  paragraphUuid?: string
  fieldName?: string
  fieldText?: string
} {
  const blockEl = target.closest('[data-bk-uuid]')
  const paragraphUuid = blockEl?.getAttribute('data-bk-uuid') ?? undefined

  // Walk up from target to find the editable field element.
  let fieldName: string | undefined
  let fieldEl: HTMLElement | undefined
  let el: HTMLElement | null = target
  while (el && el !== blockEl) {
    if (el.dataset.blokkliEditableField) {
      fieldName = el.dataset.blokkliEditableField
      fieldEl = el
      break
    }
    el = el.parentElement
  }

  const fieldText = fieldEl?.textContent?.trim() || undefined

  return { paragraphUuid, fieldName, fieldText }
}

type Result = z.infer<typeof resultSchema>

export default defineBlokkliAgentTool({
  name: 'get_readability_issues',
  description:
    'Run all readability analyzers against the full page. Returns an object keyed by paragraph UUID and field name, with the current field value and a list of issues. Each issue contains the flagged text segment, impact, and scores. Use the result to call batch_rewrite_text directly.',
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
    const { analyze, ui, $t } = ctx.app

    await analyze.ensureInitialized()

    const readabilityAnalyzers = analyze.analyzers.value.filter(
      (a) => a.type === 'readability' && !a.requireRawPage,
    )

    if (readabilityAnalyzers.length === 0) {
      return {
        label: $t(
          'aiAgentAnalyzeContentDone',
          'Analyzed @count results',
        ).replace('@count', '0'),
        result: {},
      }
    }

    const analyzerCtx = analyze.createContext(ui.providerElement)
    const result: Result = {}

    for (const analyzer of readabilityAnalyzers) {
      const rawResults = await analyze.runAnalyzer(analyzer, analyzerCtx)

      for (const r of rawResults) {
        const rawNodes = Array.isArray(r.nodes) ? r.nodes : [r.nodes]

        for (const node of rawNodes) {
          const targets = Array.isArray(node.targets)
            ? node.targets
            : [node.targets]

          for (const target of targets) {
            if (!(target instanceof HTMLElement)) continue

            const info = resolveTargetInfo(target)
            if (!info.paragraphUuid || !info.fieldName) continue

            const targetText = target.textContent?.trim()
            if (!targetText) continue

            const uuid = info.paragraphUuid
            const field = info.fieldName

            if (!result[uuid]) {
              result[uuid] = {}
            }
            if (!result[uuid][field]) {
              result[uuid][field] = {
                fieldValue: info.fieldText,
                issues: [],
              }
            }

            result[uuid][field].issues.push({
              text: targetText,
              impact: node.impact,
              scores: node.scores,
            })

            break
          }
        }
      }
    }

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
