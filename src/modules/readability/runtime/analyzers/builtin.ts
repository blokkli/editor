import type { AnalyzeImpact } from '#blokkli/editor/features/analyze/analyzers/types'
import type {
  ReadabilityAnalyzer,
  ReadabilityBand,
} from '#blokkli/editor/features/analyze/readability/types'

type LangCode = 'en' | 'de' | 'fr' | 'it'

type ScoreDirection = 'higher_harder' | 'higher_easier'

type ReferenceRow = {
  range: string
  label: string
}

type ReadabilityScoreConfig = {
  label: string
  compute: (text: string, ctx: ComputeContext) => number
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

type ComputeContext = {
  syllableCount: (word: string) => number
}

// Formulas copied verbatim from @lunarisapp/readability (MIT).
// https://github.com/LunarisApp/text-tools

function fleschReadingEase(
  sentences: number,
  syllablesPerWord: number,
  coefficients: { base: number; sentences: number; syllablesPerWord: number },
): number {
  return (
    coefficients.base -
    coefficients.sentences * sentences -
    coefficients.syllablesPerWord * syllablesPerWord
  )
}

function gulpeaseIndex(
  sentences: number,
  chars: number,
  words: number,
): number {
  const BASE = 89
  const SENTENCES_COEF = 300
  const CHARS_COEF = 10
  return (SENTENCES_COEF * sentences - CHARS_COEF * chars) / words + BASE
}

function lix(
  words: number,
  longWords: number,
  wordsPerSentence: number,
): number {
  if (words === 0) return 0
  return wordsPerSentence + (longWords * 100) / words
}

const WSTF_VARIANT_1 = {
  ms: 0.1935,
  sl: 0.1672,
  iw: 0.1297,
  es: -0.0327,
  base: -0.875,
}

function wienerSachtextformel(
  words: number,
  sentences: number,
  longWords: number,
  polysyllables: number,
  monosyllables: number,
): number {
  const { ms, sl, iw, es, base } = WSTF_VARIANT_1
  const msVal = (100 * polysyllables) / words
  const slVal = words / sentences
  const iwVal = (100 * longWords) / words
  const esVal = (100 * monosyllables) / words
  return base + ms * msVal + sl * slVal + iw * iwVal + es * esVal
}

// Per-language FRE coefficients from @lunarisapp/readability (MIT).
const FRE_COEFFICIENTS: Record<
  LangCode,
  { base: number; sentences: number; syllablesPerWord: number }
> = {
  en: { base: 206.835, sentences: 1.015, syllablesPerWord: 84.6 },
  de: { base: 180, sentences: 1, syllablesPerWord: 58.5 },
  fr: { base: 207, sentences: 1.015, syllablesPerWord: 73.6 },
  it: { base: 217, sentences: 1.3, syllablesPerWord: 0.6 },
}

// Tokenization mirrors @lunarisapp/language (MIT): keep letters, numbers,
// whitespace and apostrophes (for contractions), lowercase, split on
// whitespace runs.
function getWords(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s']/gu, '')
    .toLowerCase()
    .split(/\s+/g)
    .filter(Boolean)
}

function getSentences(text: string): string[] {
  return text.match(/[^.!?。！？\n\r]+[.!?。！？]*[\n\r]*/gu) || []
}

function sentenceCount(text: string): number {
  const sentences = getSentences(text)
  let ignored = 0
  for (const s of sentences) {
    if (getWords(s).length <= 2) ignored += 1
  }
  return Math.max(1, sentences.length - ignored)
}

function wordCount(text: string): number {
  return getWords(text).length
}

function longWordCount(text: string, threshold = 6): number {
  return getWords(text).filter((w) => w.length > threshold).length
}

function charCount(text: string): number {
  return text.replace(/\s+/g, '').length
}

function avgSentenceLength(text: string): number {
  const sentences = sentenceCount(text)
  return sentences ? wordCount(text) / sentences : 0
}

function avgWordsPerSentence(text: string): number {
  return avgSentenceLength(text)
}

function avgSyllablesPerWord(
  text: string,
  ctx: ComputeContext,
  interval?: number,
): number {
  const words = getWords(text)
  if (!words.length) return 0
  let syllables = 0
  for (const w of words) syllables += ctx.syllableCount(w)
  return interval
    ? (syllables * interval) / words.length
    : syllables / words.length
}

function polysyllableCount(text: string, ctx: ComputeContext): number {
  let count = 0
  for (const w of getWords(text)) {
    if (ctx.syllableCount(w) > 2) count += 1
  }
  return count
}

function monosyllableCount(text: string, ctx: ComputeContext): number {
  let count = 0
  for (const w of getWords(text)) {
    if (ctx.syllableCount(w) === 1) count += 1
  }
  return count
}

// German syllable counter: count vowel groups, treating common diphthongs
// (au, ei, eu, äu, ai, ie) as a single nucleus. Minimum of 1 per word.
const DE_VOWELS = /[aeiouäöüy]/i
const DE_DIPHTHONGS = /^(?:au|ei|eu|äu|ai|ie)/i

function countSyllablesDe(word: string): number {
  const w = word.toLowerCase()
  if (!w) return 0
  let count = 0
  let i = 0
  let inVowelGroup = false
  while (i < w.length) {
    const two = w.substring(i, i + 2)
    if (DE_DIPHTHONGS.test(two)) {
      if (!inVowelGroup) count += 1
      inVowelGroup = true
      i += 2
      continue
    }
    if (DE_VOWELS.test(w[i]!)) {
      if (!inVowelGroup) count += 1
      inVowelGroup = true
    } else {
      inVowelGroup = false
    }
    i += 1
  }
  return Math.max(1, count)
}

// English syllable counting uses the `syllable` npm package. Declared as an
// optional peer dep; dynamically imported so it ships in its own chunk.
let englishSyllable: ((w: string) => number) | null = null

async function loadEnglishSyllable(): Promise<(w: string) => number> {
  if (!englishSyllable) {
    const mod = await import('syllable')
    englishSyllable = mod.syllable
  }
  return englishSyllable
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
    compute: (text, ctx) =>
      fleschReadingEase(
        avgSentenceLength(text),
        avgSyllablesPerWord(text, ctx),
        FRE_COEFFICIENTS.en,
      ),
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
    compute: (text, ctx) =>
      wienerSachtextformel(
        wordCount(text),
        sentenceCount(text),
        longWordCount(text),
        polysyllableCount(text, ctx),
        monosyllableCount(text, ctx),
      ),
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
    compute: (text) =>
      lix(wordCount(text), longWordCount(text), avgWordsPerSentence(text)),
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
    compute: (text) =>
      gulpeaseIndex(sentenceCount(text), charCount(text), wordCount(text)),
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
 * Gulpease (it). English syllable counting uses the `syllable` npm package,
 * loaded lazily on the first `analyze()` call. German syllable counting uses
 * a local vowel-group heuristic. French and Italian formulas don't need
 * syllables at all.
 */
export function createBuiltinReadabilityAnalyzer(): ReadabilityAnalyzer {
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

      const syllableCount =
        langcode === 'en' ? await loadEnglishSyllable() : countSyllablesDe
      const ctx: ComputeContext = { syllableCount }
      const config = getConfig(langcode)

      return texts.map((text) => {
        const trimmed = text.trim()
        if (!trimmed) return null

        const words = segmentWords(trimmed)
        if (words.length < config.minWords) return null

        const score = safe(() => config.compute(trimmed, ctx))
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
