import type { BlokkliApp } from '#blokkli/editor/types/app'
import type {
  ReadabilityAnalysisResult,
  ReadabilityBand,
} from '#blokkli/editor/features/analyze/readability/types'
import type { TextFieldValue } from '#blokkli/editor/providers/fieldValue'

type ReadabilityIssue = {
  text: string
  impact?: string
  score?: number
}

type ReadabilityFieldResult = {
  fieldValue?: string
  issues: ReadabilityIssue[]
}

export type ReadabilityResult = Record<
  string,
  Record<string, ReadabilityFieldResult>
>

/** User-facing readability level (the band vocabulary is `easy|ok|hard`). */
export type ReadabilityLevel = 'good' | 'ok' | 'hard'

/** Worst-first severity ordering for readability bands. */
const BAND_SEVERITY: Record<ReadabilityBand, number> = {
  easy: 0,
  ok: 1,
  hard: 2,
}

/** Map a readability band to its user-facing level (`easy` → `good`). */
export function bandToLevel(band: ReadabilityBand): ReadabilityLevel {
  return band === 'hard' ? 'hard' : band === 'ok' ? 'ok' : 'good'
}

/**
 * Reduce a field's readability chunks to its single worst assessment. Chunks
 * with a null band/score can't be analyzed (e.g. the text is below the
 * analyzer's minimum word count) and are ignored. The "worst" chunk is the one
 * with the highest-severity band, tie-broken by the lowest score, so the
 * returned `level` and `score` always come from the same chunk.
 *
 * Returns `null` when nothing was scorable — callers decide how to surface that
 * (e.g. an "unknown" level, or "good"/no-retry).
 */
export function worstReadability(
  chunks: ReadonlyArray<{
    band: ReadabilityBand | null
    score: number | null
  }>,
): { level: ReadabilityLevel; score: number } | null {
  let worst: { band: ReadabilityBand; score: number } | null = null
  for (const chunk of chunks) {
    if (chunk.band === null || chunk.score === null) continue
    if (
      !worst ||
      BAND_SEVERITY[chunk.band] > BAND_SEVERITY[worst.band] ||
      (BAND_SEVERITY[chunk.band] === BAND_SEVERITY[worst.band] &&
        chunk.score < worst.score)
    ) {
      worst = { band: chunk.band, score: chunk.score }
    }
  }
  return worst ? { level: bandToLevel(worst.band), score: worst.score } : null
}

/**
 * Map a ReadabilityAnalysisResult (keyed by "{uuid}/{fieldName}") to the
 * agent ReadabilityResult shape (nested uuid → fieldName → issues).
 */
function mapAnalysisToResult(
  analysis: ReadabilityAnalysisResult,
): ReadabilityResult {
  const result: ReadabilityResult = {}

  for (const [key, fieldResult] of Object.entries(analysis)) {
    const slashIndex = key.indexOf('/')
    if (slashIndex === -1) continue

    const uuid = key.slice(0, slashIndex)
    const fieldName = key.slice(slashIndex + 1)

    const issueChunks = fieldResult.chunks.filter(
      (c): c is typeof c & { score: number; band: string; impact: string } =>
        c.score !== null && (c.band === 'hard' || c.band === 'ok'),
    )
    if (issueChunks.length === 0) continue

    if (!result[uuid]) {
      result[uuid] = {}
    }
    result[uuid][fieldName] = {
      fieldValue: fieldResult.rawValue || undefined,
      issues: issueChunks.map((c) => ({
        text: c.text,
        impact: c.impact,
        score: c.score,
      })),
    }
  }

  return result
}

/**
 * Run readability analysis against all fields on the page and return results
 * grouped by paragraph UUID and field name.
 */
export async function runReadabilityAnalysis(
  app: BlokkliApp,
): Promise<ReadabilityResult> {
  const analysis = await app.readability.analyzeAllFields()
  return mapAnalysisToResult(analysis)
}

/**
 * Run readability analysis for specific field values (without reading from
 * DOM/adapter). Used by the retry loop to analyze proposed values directly.
 */
export async function runReadabilityAnalysisForValues(
  app: BlokkliApp,
  fields: TextFieldValue[],
): Promise<ReadabilityResult> {
  const analysis = await app.readability.analyzeFieldValues(fields)
  return mapAnalysisToResult(analysis)
}
