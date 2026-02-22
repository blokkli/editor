import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'

const nodeSchema = z.object({
  description: z.string().optional(),
  impact: z.string().optional(),
  scores: z.record(z.string(), z.number()).optional(),
})

const textResultSchema = z.object({
  text: z.string(),
  nodes: z.array(nodeSchema),
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
  name: 'check_readability',
  description:
    'Check readability scores for one or more text strings. Returns readability metrics (e.g. Flesch-Kincaid) for each text. Use this to quickly evaluate or compare text readability without needing block UUIDs.',
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

    const rawResults = await analyze.runOnTexts(params.texts, ['readability'])

    const results: z.infer<typeof textResultSchema>[] = rawResults.map(
      (tr) => ({
        text: tr.text,
        nodes: tr.nodes.map((node) => ({
          description: node.description,
          impact: node.impact,
          scores: node.scores,
        })),
      }),
    )

    return {
      label: $t(
        'aiAgentCheckReadabilityDone',
        'Checked readability for @count texts',
      ).replace('@count', String(results.length)),
      result: { results },
    }
  },
})
