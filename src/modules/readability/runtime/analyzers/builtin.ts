import type { AnalyzeImpact } from '#blokkli/editor/features/analyze/analyzers/types'
import type {
  ReadabilityAnalyzer,
  ReadabilityBand,
} from '#blokkli/editor/features/analyze/readability/types'
import type { Language, TextReadability } from '@lunarisapp/readability'

type LangCode = 'en' | 'de' | 'fr' | 'it'

type ScoreDirection = 'higher_harder' | 'higher_easier'

type ReferenceRow = {
  range: string
  label: string
}

type ReadabilityScoreConfig = {
  label: string
  compute: (tr: TextReadability, text: string) => number
  direction: ScoreDirection
  bands: { easy: number; ok: number }
  impactThresholds: [number, number, number]
  minWords: number
  referenceTable: ReferenceRow[]
  /**
   * Optional language-specific score formatter. When provided, raw numeric
   * scores are converted to a human-readable string (e.g. FRE → CEFR bucket).
   */
  formatScore?: (value: number) => string
}

/**
 * Flesch Reading Ease → CEFR bucket.
 * Source: Linguapress correspondence table.
 * Note: this is an approximate mapping — FRE measures sentence length and
 * syllables per word, so texts with short sentences but advanced vocabulary
 * can fall into a lower-than-expected CEFR bucket.
 */
function fleschToCefr(score: number): string {
  if (score >= 90) return 'A1'
  if (score >= 80) return 'A2'
  if (score >= 70) return 'B1'
  if (score >= 60) return 'B2'
  if (score >= 50) return 'C1'
  return 'C2'
}

const SCORE_CONFIGS: Record<LangCode, ReadabilityScoreConfig> = {
  en: {
    label: 'CEFR',
    compute: (tr, text) => tr.fleschReadingEase(text),
    direction: 'higher_easier',
    // Aligned to CEFR buckets: easy = A1–B2 (FRE ≥ 60), ok = C1 (50–60),
    // hard = C2 (< 50). Keeps each CEFR level in exactly one analyze section.
    bands: { easy: 60, ok: 50 },
    impactThresholds: [40, 25, 10],
    minWords: 15,
    formatScore: fleschToCefr,
    referenceTable: [
      { range: 'FRE 90–100', label: 'A1 — beginners' },
      { range: 'FRE 80–90', label: 'A2 — elementary' },
      { range: 'FRE 70–80', label: 'B1 — intermediate' },
      { range: 'FRE 60–70', label: 'B2 — upper intermediate (target)' },
      { range: 'FRE 50–60', label: 'C1 — advanced (could be simpler)' },
      {
        range: 'FRE 0–50',
        label: 'C2 — mastery — this is what gets flagged',
      },
    ],
  },
  de: {
    label: 'WSTF',
    compute: (tr, text) => tr.wienerSachtextformel(text, 1),
    direction: 'higher_harder',
    bands: { easy: 15, ok: 18 },
    impactThresholds: [16, 20, 24],
    minWords: 5,
    referenceTable: [
      { range: 'Below 8', label: "Very easy (children's books)" },
      { range: '8–15', label: 'Easy (standard website content)' },
      { range: '15–18', label: 'Moderately difficult (could be simpler)' },
      {
        range: 'Above 18',
        label: 'Difficult — this is what gets flagged',
      },
      { range: 'Above 24', label: 'Critical — must be simplified' },
    ],
  },
  fr: {
    label: 'LIX',
    compute: (tr, text) => tr.lix(text),
    direction: 'higher_harder',
    bands: { easy: 40, ok: 59 },
    impactThresholds: [50, 60, 70],
    minWords: 5,
    referenceTable: [
      { range: 'Below 25', label: "Very easy (children's books)" },
      { range: '25–40', label: 'Easy (simple articles)' },
      { range: '40–50', label: 'Medium (newspapers)' },
      { range: '50–60', label: 'Difficult (official documents)' },
      {
        range: 'Above 60',
        label: 'Very difficult — this is what gets flagged',
      },
      { range: 'Above 70', label: 'Critical — must be simplified' },
    ],
  },
  it: {
    label: 'Gulpease',
    compute: (tr, text) => tr.gulpeaseIndex(text),
    direction: 'higher_easier',
    bands: { easy: 80, ok: 60 },
    impactThresholds: [60, 50, 40],
    minWords: 5,
    referenceTable: [
      { range: 'Above 80', label: "Very easy (children's books)" },
      { range: '60–80', label: 'Easy (simple articles)' },
      { range: '50–60', label: 'Medium (newspapers)' },
      { range: '40–50', label: 'Difficult (official documents)' },
      {
        range: 'Below 40',
        label: 'Very difficult — this is what gets flagged',
      },
      { range: 'Below 30', label: 'Critical — must be simplified' },
    ],
  },
}

const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'it']

function getConfig(langcode: string): ReadabilityScoreConfig {
  if (isSupportedLangcode(langcode)) {
    return SCORE_CONFIGS[langcode]
  }
  return SCORE_CONFIGS.en
}

function isSupportedLangcode(v: string): v is LangCode {
  return v === 'en' || v === 'de' || v === 'fr' || v === 'it'
}

function mapLang(langcode: string): Language {
  const lc = (langcode || '').toLowerCase()
  if (lc.startsWith('de')) return 'de_CH'
  if (lc.startsWith('fr')) return 'fr'
  if (lc.startsWith('it')) return 'it'
  return 'en_GB'
}

function segmentWords(text: string): string[] {
  if ('Segmenter' in Intl) {
    const seg = new (Intl as any).Segmenter(undefined, { granularity: 'word' })
    const out: string[] = []
    for (const s of seg.segment(text) as any) {
      if (s.isWordLike)
        out.push(text.slice(s.index, s.index + s.segment.length))
    }
    return out
  }
  return text.match(/\p{Letter}+(?:'\p{Letter}+)?/gu) ?? []
}

function safe(fn: () => number): number | undefined {
  try {
    const n = fn()
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

function classifyBandGeneric(
  score: number,
  config: ReadabilityScoreConfig,
): ReadabilityBand {
  if (config.direction === 'higher_easier') {
    if (score >= config.bands.easy) return 'easy'
    if (score >= config.bands.ok) return 'ok'
    return 'hard'
  }
  // higher_harder
  if (score <= config.bands.easy) return 'easy'
  if (score <= config.bands.ok) return 'ok'
  return 'hard'
}

function impactForScoreGeneric(
  score: number,
  config: ReadabilityScoreConfig,
): AnalyzeImpact {
  const [moderate, serious, critical] = config.impactThresholds
  if (config.direction === 'higher_easier') {
    if (score < critical) return 'critical'
    if (score < serious) return 'serious'
    if (score < moderate) return 'moderate'
    return 'minor'
  }
  // higher_harder
  if (score >= critical) return 'critical'
  if (score >= serious) return 'serious'
  if (score >= moderate) return 'moderate'
  return 'minor'
}

function buildAgentContext(config: ReadabilityScoreConfig): string {
  const rows = config.referenceTable
    .map((row) => `- ${row.range}: ${row.label}`)
    .join('\n')
  return `## ${config.label} Score Reference\n\n${rows}`
}

/**
 * Create the built-in readability analyzer using language-specific algorithms:
 * Flesch Reading Ease → CEFR (en), Wiener Sachtextformel (de), LIX (fr),
 * Gulpease (it). The analyzer is stateless: each per-language method takes
 * the active langcode as an argument. The heavy `@lunarisapp/readability`
 * dependency is loaded lazily on the first `analyze()` call.
 */
export function createBuiltinReadabilityAnalyzer(): ReadabilityAnalyzer {
  let textReadability: TextReadability | null = null
  let loadedLang: Language | null = null

  async function ensureTextReadability(
    langcode: string,
  ): Promise<TextReadability> {
    const mappedLang = mapLang(langcode)
    if (!textReadability || loadedLang !== mappedLang) {
      const { TextReadability } = await import('@lunarisapp/readability')
      textReadability = new TextReadability({
        lang: mappedLang,
        cache: true,
      })
      loadedLang = mappedLang
    }
    return textReadability
  }

  return {
    id: 'builtin',
    label: (langcode: string) => {
      if (langcode === 'de') return 'Lesbarkeit'
      return 'Readability'
    },
    description:
      'Analyzes text readability using language-specific algorithms (LIX, Wiener Sachtextformel, Gulpease).',
    supportedLanguages: SUPPORTED_LANGUAGES,

    minWordsForConfidence(langcode: string): number {
      return getConfig(langcode).minWords
    },

    scoreLabel(langcode: string): string {
      return getConfig(langcode).label
    },

    async analyze(
      texts: string[],
      langcode: string,
    ): Promise<(number | null)[]> {
      if (!isSupportedLangcode(langcode)) {
        return texts.map(() => null)
      }

      const tr = await ensureTextReadability(langcode)
      const config = getConfig(langcode)
      return texts.map((text) => {
        const trimmed = text.trim()
        if (!trimmed) return null

        const words = segmentWords(trimmed)
        if (words.length < config.minWords) return null

        const score = safe(() => config.compute(tr, trimmed))
        return score != null ? round(score) : null
      })
    },

    classifyBand(score: number, langcode: string): ReadabilityBand {
      return classifyBandGeneric(score, getConfig(langcode))
    },

    impactForScore(score: number, langcode: string): AnalyzeImpact {
      return impactForScoreGeneric(score, getConfig(langcode))
    },

    getAgentContext(langcode: string): string {
      return buildAgentContext(getConfig(langcode))
    },

    formatScore(value: number, langcode: string): string {
      const config = getConfig(langcode)
      if (config.formatScore) {
        return config.formatScore(value)
      }
      return Number.isFinite(value) ? value.toFixed(1) : String(value)
    },

    getScaleInfo(langcode: string) {
      const config = getConfig(langcode)
      // Thresholds in ascending order.
      const t1 = Math.min(config.bands.easy, config.bands.ok)
      const t2 = Math.max(config.bands.easy, config.bands.ok)
      // Add padding beyond thresholds for visual range.
      const padding = Math.round((t2 - t1) * 0.5)
      return {
        thresholds: [t1, t2] as [number, number],
        direction: config.direction,
        scaleMin: Math.max(0, t1 - padding),
        scaleMax: t2 + padding,
      }
    },
  }
}
