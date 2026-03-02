import type { AnalyzeImpact } from '../analyzers/types'
import type { ReadabilityAnalyzer, ReadabilityBand } from './types'
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
  referenceTable: ReferenceRow[]
}

const SCORE_CONFIGS: Record<LangCode, ReadabilityScoreConfig> = {
  en: {
    label: 'LIX',
    compute: (tr, text) => tr.lix(text),
    direction: 'higher_harder',
    bands: { easy: 40, ok: 59 },
    impactThresholds: [50, 60, 70],
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
  de: {
    label: 'WSTF',
    compute: (tr, text) => tr.wienerSachtextformel(text, 1),
    direction: 'higher_harder',
    bands: { easy: 7, ok: 14 },
    impactThresholds: [12, 16, 20],
    referenceTable: [
      { range: 'Below 4', label: "Very easy (children's books)" },
      { range: '4–7', label: 'Easy (simple articles)' },
      { range: '7–11', label: 'Medium (standard website content)' },
      { range: '11–14', label: 'Moderately difficult (official documents)' },
      {
        range: 'Above 14',
        label: 'Difficult — this is what gets flagged',
      },
      { range: 'Above 20', label: 'Critical — must be simplified' },
    ],
  },
  fr: {
    label: 'LIX',
    compute: (tr, text) => tr.lix(text),
    direction: 'higher_harder',
    bands: { easy: 40, ok: 59 },
    impactThresholds: [50, 60, 70],
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
const DEFAULT_MIN_WORDS = 5

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
 * LIX (en/fr), Wiener Sachtextformel (de), Gulpease (it).
 */
export function createBuiltinReadabilityAnalyzer(): ReadabilityAnalyzer {
  let textReadability: TextReadability | null = null
  let currentLangcode = 'en'

  return {
    id: 'builtin',
    label: (langcode: string) => {
      if (langcode === 'de') return 'Lesbarkeit'
      return 'Readability'
    },
    description:
      'Analyzes text readability using language-specific algorithms (LIX, Wiener Sachtextformel, Gulpease).',
    supportedLanguages: SUPPORTED_LANGUAGES,
    minWordsForConfidence: DEFAULT_MIN_WORDS,

    get scoreLabel(): string {
      return getConfig(currentLangcode).label
    },

    async init(langcode: string) {
      currentLangcode = langcode
      const { TextReadability } = await import('@lunarisapp/readability')
      textReadability = new TextReadability({
        lang: mapLang(langcode),
        cache: true,
      })
    },

    async analyze(
      texts: string[],
      langcode: string,
    ): Promise<(number | null)[]> {
      if (!isSupportedLangcode(langcode)) {
        return texts.map(() => null)
      }

      if (!textReadability) {
        const { TextReadability } = await import('@lunarisapp/readability')
        textReadability = new TextReadability({
          lang: mapLang(langcode),
          cache: true,
        })
      }

      const config = getConfig(langcode)
      const tr = textReadability
      return texts.map((text) => {
        const trimmed = text.trim()
        if (!trimmed) return null

        const words = segmentWords(trimmed)
        if (words.length < DEFAULT_MIN_WORDS) return null

        const score = safe(() => config.compute(tr, trimmed))
        return score != null ? round(score) : null
      })
    },

    classifyBand(score: number, langcode: string): ReadabilityBand {
      return classifyBandGeneric(score, getConfig(langcode))
    },

    impactForScore(score: number): AnalyzeImpact {
      return impactForScoreGeneric(score, getConfig(currentLangcode))
    },

    getAgentContext(): string {
      return buildAgentContext(getConfig(currentLangcode))
    },
  }
}
