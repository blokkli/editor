import { z } from 'zod'
import { defineBlokkliAgentTool } from '#blokkli/agent/app/composables'
import type { ReadabilityBand } from '#blokkli/editor/features/analyze/readability/types'

/**
 * Map a readability band to a user-friendly level.
 */
function bandToLevel(band: ReadabilityBand): 'good' | 'ok' | 'hard' {
  if (band === 'hard') return 'hard'
  if (band === 'ok') return 'ok'
  return 'good'
}

const textResultSchema = z.object({
  text: z.string(),
  level: z.enum(['good', 'ok', 'hard']),
  score: z.number(),
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
    const { readability, $t, context } = ctx.app
    const langcode = context.value.language

    const results: z.infer<typeof textResultSchema>[] = []

    for (const text of params.texts) {
      const chunks = await readability.analyzeText(text, langcode)

      // Determine worst band/score across all chunks.
      let worstLevel: 'good' | 'ok' | 'hard' = 'good'
      let worstScore = 0

      for (const chunk of chunks) {
        if (chunk.band === null || chunk.score === null) continue
        const level = bandToLevel(chunk.band)
        if (level === 'hard' || (level === 'ok' && worstLevel === 'good')) {
          worstLevel = level
          worstScore = chunk.score
        }
      }

      results.push({
        text,
        level: worstLevel,
        score: worstScore,
      })
    }

    return {
      label: $t(
        'aiAgentCheckReadabilityDone',
        'Checked readability for @count texts',
      ).replace('@count', String(results.length)),
      result: { results },
    }
  },
})
