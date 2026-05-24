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
  level: z.enum(['good', 'ok', 'hard', 'unknown']),
  score: z.number().nullable(),
  note: z.string().optional(),
})

// Worst-first severity ordering for readability bands.
const LEVEL_SEVERITY: Record<'good' | 'ok' | 'hard', number> = {
  good: 0,
  ok: 1,
  hard: 2,
}

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
    'Check readability scores for one or more text strings. Returns a readability level ("good", "ok", or "hard") and a score for each text. Use this to evaluate whether a rewritten text has better readability before applying it. Texts too short to score reliably return level "unknown" and score null.',
  category: 'query',
  lazy: true,
  modes: ['readonly', 'editing', 'translating', 'review'],
  requiredAdapterMethods: ['getAnalyzers'],
  isAvailable: (app) => app.readability.isAvailable.value,
  label($t) {
    return $t('checkingReadability', 'Checking readability', { more: true })
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

      // Determine the worst band and the worst (lowest) score across all
      // scorable chunks. Chunks with a null score/band can't be analyzed (e.g.
      // the text is below the analyzer's minimum word count).
      let worstLevel: 'good' | 'ok' | 'hard' = 'good'
      let worstScore: number | null = null

      for (const chunk of chunks) {
        if (chunk.band === null || chunk.score === null) continue
        const level = bandToLevel(chunk.band)
        if (LEVEL_SEVERITY[level] > LEVEL_SEVERITY[worstLevel]) {
          worstLevel = level
        }
        if (worstScore === null || chunk.score < worstScore) {
          worstScore = chunk.score
        }
      }

      if (worstScore === null) {
        // Nothing could be scored — report honestly instead of a false "good".
        results.push({
          text,
          level: 'unknown',
          score: null,
          note: 'Text too short to score reliably.',
        })
      } else {
        results.push({
          text,
          level: worstLevel,
          score: worstScore,
        })
      }
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
