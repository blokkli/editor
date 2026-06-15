# Custom Analyzer

The built-in analyzer uses classic formulas (Flesch, WSTF, LIX, Gulpease). A
project can replace it with its own scoring engine — for example to score text
through a backend model, use a domain-specific metric, or align scores to a
brand readability standard.

A custom analyzer is supplied through the adapter's `getReadabilityAnalyzer`
method. When you provide your own, you generally do **not** enable the
readability module — it exists only to ship the default implementation.

## Providing the analyzer

Return `getReadabilityAnalyzer` from your edit adapter (or from an adapter
extension). It returns an object implementing the `ReadabilityAnalyzer`
contract; the function may be async:

```typescript
import { defineBlokkliEditAdapter } from '#blokkli/editor/adapter'
import { readabilityAnalyzer } from '#blokkli/analyzer'
import { createCefrReadabilityAnalyzer } from './blokkli/analyzer/readability'

export default defineBlokkliEditAdapter(async (ctx) => {
  const baseAdapter = await someBaseAdapter(ctx)

  return {
    ...baseAdapter,
    // The scoring engine (drives inline indicators + sidebar).
    getReadabilityAnalyzer: () => createCefrReadabilityAnalyzer(),
    // Surface the results in the Analyze sidebar.
    getAnalyzers: () => [readabilityAnalyzer()],
  }
})
```

`readabilityAnalyzer()` is the generic sidebar wrapper — it delegates to whatever
engine `getReadabilityAnalyzer` returns, so you add it once regardless of which
analyzer is active.

## The `ReadabilityAnalyzer` contract

```typescript
type ReadabilityBand = 'easy' | 'ok' | 'hard'
type AnalyzeImpact = 'minor' | 'moderate' | 'serious' | 'critical'

type ReadabilityAnalyzer = {
  /** Stable identifier for this analyzer. */
  id: string
  label?: string | ((langcode: string) => string)
  description?: string
  /** Restrict scoring to these langcodes. Omit to support all. */
  supportedLanguages?: string[]

  /** Short label for the score metric, e.g. 'CEFR', 'LIX'. */
  scoreLabel(langcode: string): string

  /** Minimum word count for a confident score. */
  minWordsForConfidence?(langcode: string): number

  /**
   * Score a batch of plain-text strings. Returns one score per input
   * (or null if not scorable). May do lazy/async setup on first call —
   * this is where a backend request belongs.
   */
  analyze(texts: string[], langcode: string): Promise<(number | null)[]>

  /** Classify a score into a band. */
  classifyBand(score: number, langcode: string): ReadabilityBand

  /** Map a score to an impact severity for the sidebar. */
  impactForScore(score: number, langcode: string): AnalyzeImpact

  /** Reference text injected into the agent prompt (e.g. a score table). */
  getAgentContext(langcode: string): string

  /** Optional display formatting, e.g. numeric 4 → 'B2'. */
  formatScore?(value: number, langcode: string): string

  /** Optional scale info for the score-bar visualization. */
  getScaleInfo?(langcode: string): {
    /** [easy/ok boundary, ok/hard boundary], ascending. */
    thresholds: [number, number]
    direction: 'higher_easier' | 'higher_harder'
    scaleMin: number
    scaleMax: number
  }
}
```

Key points:

- **`analyze` is batched and async.** The editor passes all text chunks at once;
  return scores in the same order. This is the right place to call a backend
  endpoint and to cache results. Return `null` for texts that are too short or
  otherwise not scorable.
- **Language is explicit.** Every method receives the active `langcode` — the
  analyzer is stateless with respect to language.
- **`direction` matters.** Built-in metrics differ on whether a higher score
  means easier or harder text; set `direction` so the score bar renders bands
  correctly.

## Example: a backend-backed CEFR analyzer

This analyzer scores text as CEFR levels (A1–C2) via a backend request, maps
them to a numeric `1–6` scale (higher = harder), and caches results by text.

```typescript
import type { AnalyzeImpact } from '#blokkli/analyzer/types'
import type {
  ReadabilityAnalyzer,
  ReadabilityBand,
} from '#blokkli/editor/features/analyze/readability/types'

const CEFR_TO_SCORE = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 } as const
const SCORE_TO_CEFR = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const MIN_WORDS = 3

function isScorable(text: string): boolean {
  if (text.length < 15) return false
  return text.trim().split(/\s+/).length >= MIN_WORDS
}

export function createCefrReadabilityAnalyzer(): ReadabilityAnalyzer {
  // CEFR is categorical: a level for a string doesn't change until the text
  // does, so cache by text to avoid re-fetching.
  const cache = new Map<string, keyof typeof CEFR_TO_SCORE>()

  return {
    id: 'bs:cefr',
    label: 'Lesbarkeit (CEFR)',
    description: 'Bewertet Texte nach dem CEFR-Referenzrahmen.',

    scoreLabel: () => 'CEFR',
    minWordsForConfidence: () => MIN_WORDS,

    async analyze(texts) {
      // Fetch only unique, scorable, uncached texts.
      const uncached = [
        ...new Set(texts.filter((t) => isScorable(t) && !cache.has(t))),
      ]
      if (uncached.length) {
        const scores = await fetchCefrLevels(uncached) // your backend call
        for (const { text, cefrLevel } of scores) {
          if (cefrLevel) cache.set(text, cefrLevel)
        }
      }
      return texts.map((t) => {
        if (!isScorable(t)) return null
        const level = cache.get(t)
        return level ? CEFR_TO_SCORE[level] : null
      })
    },

    classifyBand(score): ReadabilityBand {
      // A1–B2 (≤4) = easy, C1 (5) = ok, C2 (6) = hard.
      if (score <= 4) return 'easy'
      if (score <= 5) return 'ok'
      return 'hard'
    },

    impactForScore(score): AnalyzeImpact {
      if (score >= 6) return 'serious'
      if (score >= 5) return 'moderate'
      return 'minor'
    },

    formatScore: (value) => SCORE_TO_CEFR[Math.round(value)] ?? String(value),

    getScaleInfo: () => ({
      thresholds: [4, 5],
      direction: 'higher_harder',
      scaleMin: 1,
      scaleMax: 6,
    }),

    getAgentContext: () =>
      [
        '## CEFR Level Reference',
        '',
        'Texts are scored A1–C2. A1–B2 are acceptable, C1 should be',
        'simplified, C2 is too complex and must be rewritten.',
      ].join('\n'),
  }
}
```

The batched `analyze` plus the per-text cache means a full-page analysis makes a
single backend request for all unique passages, and re-analysis is free until the
text changes.

## See also

- [Readability](/modules/readability/) — the module and built-in analyzer.
- [Adapter](/adapter/overview) — the edit adapter and extension system.
