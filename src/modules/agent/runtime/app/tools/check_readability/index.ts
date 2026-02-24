import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

/**
 * Map analyzer impact levels to a user-friendly readability level.
 * The analyzer always returns an impact (minor/moderate/serious/critical),
 * even for easy texts. We translate that into a clear "good", "ok", or "hard".
 */
function impactToLevel(impact?: string): 'good' | 'ok' | 'hard' {
  if (impact === 'critical' || impact === 'serious') return 'hard'
  if (impact === 'moderate') return 'ok'
  return 'good'
}

const textResultSchema = z.object({
  text: z.string(),
  level: z.enum(['good', 'ok', 'hard']),
  scores: z.record(z.string(), z.number()),
})

const paramsSchema = z.object({
  texts: z
    .array(z.string())
    .describe(
      'Text strings to check for readability. Each string is analyzed independently.',
    ),
})

const resultSchema = z.object({
  results: z.array(textResultSchema),
})

export default defineBlokkliAgentTool({
  name: 'check_readability_for_texts',
  description:
    'Check readability scores for one or more text strings. Returns a readability level ("good", "ok", or "hard") and metrics (LIX, CLI, ARI) for each text. Use this to evaluate whether a rewritten text has better readability before applying it.',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  requiredAdapterMethods: ['getAnalyzers'],
  label($t) {
    return $t('aiAgentCheckReadabilityRunning', 'Checking readability...')
  },
  prunedSummary: (r) => {
    return `checked readability for ${r.results.length} texts`
  },
  paramsSchema,
  resultSchema,
  async execute(ctx, params) {
    const { analyze, $t } = ctx.app

    await analyze.ensureInitialized()

    const rawResults = await analyze.runOnTexts(params.texts, 'readability')

    const results: z.infer<typeof textResultSchema>[] = rawResults.map((tr) => {
      // The analyzer returns one node per text with scores and impact.
      // Texts too short for analysis return no nodes.
      const node = tr.nodes[0]

      return {
        text: tr.text,
        level: impactToLevel(node?.impact),
        scores: node?.scores ?? {},
      }
    })

    return {
      label: $t(
        'aiAgentCheckReadabilityDone',
        'Checked readability for @count texts',
      ).replace('@count', String(results.length)),
      result: { results },
    }
  },
})
