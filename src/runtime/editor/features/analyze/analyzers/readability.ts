import { defineAnalyzer } from './defineAnalyzer'
import type { AnalyzeImpact, AnalyzeNode, AnalyzeResult } from './types'
import type { TextElement } from './helpers/collectTextElements'
import type { Language, TextReadability } from '@lunarisapp/readability'
import type { TextProvider } from '#blokkli/editor/providers/texts'

type LangCode = 'en' | 'de' | 'fr' | 'it'

function isSupportedLangcode(v: string): v is LangCode {
  if (v === 'en' || v === 'de' || v === 'fr' || v === 'it') {
    return true
  }

  return false
}

const LIX_BANDS = { easyMax: 40, okMax: 59 }
const CLI_HARD_MIN = 12
const ARI_HARD_MIN = 12
const GULPEASE_BANDS = { easyMin: 80, okMin: 60 }
const MIN_WORDS_FOR_CONFIDENCE = 5

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
  return text.match(/\p{Letter}+(?:['’]\p{Letter}+)?/gu) ?? []
}

function countSentences(text: string): number {
  const m = text.match(/[.!?…]+["')\]]*(\s+|$)/g)
  if (m?.length) return m.length
  return /\p{Letter}/u.test(text) ? 1 : 0
}

type Band = 'easy' | 'ok' | 'hard' | 'n/a'

function toBand(
  lang: LangCode,
  scores: { lix?: number; cli?: number; ari?: number; gulpease?: number },
): Band {
  const { lix, cli, ari, gulpease } = scores

  if (typeof lix === 'number') {
    if (lix <= LIX_BANDS.easyMax) return 'easy'
    if (lix <= LIX_BANDS.okMax) return 'ok'
    // else hard
  }

  if (lang === 'it' && typeof gulpease === 'number') {
    if (gulpease >= GULPEASE_BANDS.easyMin) return 'easy'
    if (gulpease >= GULPEASE_BANDS.okMin) return 'ok'
    return 'hard'
  }

  const hardVotes =
    (typeof cli === 'number' && cli >= CLI_HARD_MIN ? 1 : 0) +
    (typeof ari === 'number' && ari >= ARI_HARD_MIN ? 1 : 0)

  if (hardVotes >= 1) return 'hard'
  return 'ok'
}

function impactFor(lix?: number): AnalyzeImpact {
  if (lix == null) return 'moderate'
  if (lix >= 70) return 'critical'
  if (lix >= 60) return 'serious'
  if (lix >= 50) return 'moderate'
  return 'minor'
}

function summarizeImpact(nodes: AnalyzeNode[]): AnalyzeImpact | undefined {
  const order: AnalyzeImpact[] = ['minor', 'moderate', 'serious', 'critical']
  let maxIdx = -1
  for (const n of nodes) {
    if (!n.impact) continue
    const i = order.indexOf(n.impact)
    if (i > maxIdx) maxIdx = i
  }
  return maxIdx >= 0 ? order[maxIdx] : undefined
}

function format(n?: number, d = 1) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : '—'
}

type CachedScores = {
  lix?: number
  cli?: number
  ari?: number
  gulpease?: number
  words: number
  sentences: number
  avgSentLen: number
}

type ResultCache = Map<string, CachedScores>

function analyzeReadability(
  tr: TextReadability,
  blocks: Readonly<TextElement[]>,
  langcode: LangCode,
  $t: TextProvider,
  cache: ResultCache,
): AnalyzeResult {
  const lang = langcode ?? 'en'

  const nodes: AnalyzeNode[] = []

  for (const b of blocks) {
    const text = (b.text || '').trim()
    if (!text) continue

    // Light guard against noisy flags on tiny snippets
    const words = segmentWords(text)
    if (words.length < MIN_WORDS_FOR_CONFIDENCE) {
      continue
    }

    const cacheKey = `${langcode}:${text}`
    let scores: CachedScores

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      scores = cached
    } else {
      // Calculate scores
      const sentences = Math.max(1, countSentences(text))
      const avgSentLen = words.length / sentences

      // Scores via the library (class API takes raw text)
      const lix = safe(() => tr.lix(text))
      const cli = safe(() => tr.colemanLiauIndex(text))
      const ari = safe(() => tr.automatedReadabilityIndex(text))
      const gulpease =
        lang === 'it' ? safe(() => tr.gulpeaseIndex(text)) : undefined

      scores = {
        lix,
        cli,
        ari,
        gulpease,
        words: words.length,
        sentences,
        avgSentLen,
      }

      // Store in cache
      cache.set(cacheKey, scores)
    }

    const band = toBand(lang, {
      lix: scores.lix,
      cli: scores.cli,
      ari: scores.ari,
      gulpease: scores.gulpease,
    })
    if (band !== 'hard') {
      continue
    }

    const parts: string[] = []
    parts.push(
      $t('analyzerReadabiliyHardToRead', `Hard to read (@lang).`).replace(
        '@lang',
        lang.toUpperCase(),
      ),
    )
    if (scores.lix != null) {
      parts.push(`LIX ${format(scores.lix)}`)
    }
    if (lang === 'it' && scores.gulpease != null) {
      parts.push(`Gulpease ${format(scores.gulpease)}`)
    }
    if (scores.cli != null) {
      parts.push(`CLI ${format(scores.cli)}`)
    }
    if (scores.avgSentLen > 25) {
      parts.push(
        $t(
          'analyzerReadabiliyAverageSentenceLength',
          `Average sentence length @length → split sentences.`,
        ).replace('@length', format(scores.avgSentLen)),
      )
    } else {
      parts.push(
        $t(
          'analyzerReadabiliyShorterSentences',
          `Consider shorter sentences and simpler wording.`,
        ),
      )
    }

    nodes.push({
      description: parts.join(' · '),
      impact: impactFor(scores.lix),
      scores: {
        ...(scores.lix != null ? { lix: round(scores.lix) } : {}),
        ...(scores.cli != null ? { cli: round(scores.cli) } : {}),
        ...(scores.ari != null ? { ari: round(scores.ari) } : {}),
        ...(scores.gulpease != null
          ? { gulpease: round(scores.gulpease) }
          : {}),
      },
      targets: [b.element],
    })
  }

  return {
    id: 'low-readability',
    title: $t('analyzerReadabiliyTitle', 'Text readability issues'),
    category: 'text',
    description: $t(
      'analyzerReadabiliyDescription',
      'Avoid texts that are hard to read.',
    ),
    link: 'https://en.wikipedia.org/wiki/Readability',
    status: nodes.length ? 'violation' : 'pass',
    nodes,
    impact: summarizeImpact(nodes),
  }
}

/**
 * Score a single text string and return an AnalyzeNode with scores,
 * regardless of the readability band. Used by analyzeText to give
 * the agent scores for every input.
 */
function scoreText(
  tr: TextReadability,
  text: string,
  langcode: LangCode,
): AnalyzeNode | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const words = segmentWords(trimmed)
  if (words.length < MIN_WORDS_FOR_CONFIDENCE) return null

  const sentences = Math.max(1, countSentences(trimmed))
  const avgSentLen = words.length / sentences

  const lix = safe(() => tr.lix(trimmed))
  const cli = safe(() => tr.colemanLiauIndex(trimmed))
  const ari = safe(() => tr.automatedReadabilityIndex(trimmed))
  const gulpease =
    langcode === 'it' ? safe(() => tr.gulpeaseIndex(trimmed)) : undefined

  const scores = {
    ...(lix != null ? { lix: round(lix) } : {}),
    ...(cli != null ? { cli: round(cli) } : {}),
    ...(ari != null ? { ari: round(ari) } : {}),
    ...(gulpease != null ? { gulpease: round(gulpease) } : {}),
  }

  const band = toBand(langcode, { lix, cli, ari, gulpease })
  const impact = impactFor(lix)

  const parts: string[] = []
  if (band === 'hard') {
    parts.push('Hard to read.')
  } else if (band === 'ok') {
    parts.push('Acceptable readability.')
  } else {
    parts.push('Easy to read.')
  }
  if (lix != null) parts.push(`LIX ${format(lix)}`)
  if (langcode === 'it' && gulpease != null) {
    parts.push(`Gulpease ${format(gulpease)}`)
  }
  if (cli != null) parts.push(`CLI ${format(cli)}`)
  parts.push(`Avg sentence length ${format(avgSentLen)}`)

  return {
    description: parts.join(' · '),
    impact,
    scores,
    targets: [],
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

function safe(fn: () => number): number | undefined {
  try {
    const n = fn()
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

export default defineAnalyzer(() => {
  let textReadability: TextReadability | null = null
  const cache: ResultCache = new Map()

  return {
    id: 'readability',
    type: 'readability',
    label: (langcode) => {
      if (langcode === 'de') {
        return 'Lesbarkeit'
      }

      return 'Readability'
    },
    description:
      'Analyzes text readability using LIX, Coleman-Liau, and ARI indices. Flags hard-to-read text blocks.',
    continuous: true,
    init: async function (context) {
      const { TextReadability } = await import('@lunarisapp/readability')
      textReadability = new TextReadability({
        lang: mapLang(context.langcode),
        cache: true,
      })
    },
    run(context) {
      if (!isSupportedLangcode(context.langcode)) {
        return
      }

      const elements = context.getTextElements()

      return analyzeReadability(
        textReadability!,
        elements,
        context.langcode,
        context.$t,
        cache,
      )
    },
    async analyzeText(text, langcode) {
      if (!isSupportedLangcode(langcode)) {
        return []
      }

      if (!textReadability) {
        const { TextReadability } = await import('@lunarisapp/readability')
        textReadability = new TextReadability({
          lang: mapLang(langcode),
          cache: true,
        })
      }

      const node = scoreText(textReadability, text, langcode)
      return node ? [node] : []
    },
  }
})
