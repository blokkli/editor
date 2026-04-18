import type { AnalyzeImpact } from '../analyzers/types'

/**
 * Classification band for a chunk of text.
 */
export type ReadabilityBand = 'easy' | 'ok' | 'hard'

/**
 * Result for a single chunk of text within a field.
 */
export type ReadabilityChunkResult = {
  text: string
  html?: string
  score: number | null
  band: ReadabilityBand | null
  impact: AnalyzeImpact | null
  description?: string
}

/**
 * Result for a single field, containing all its scored chunks.
 */
export type ReadabilityFieldResult = {
  rawValue: string
  fieldType: 'plain' | 'markup'
  chunks: ReadabilityChunkResult[]
}

/**
 * Full analysis result keyed by "{uuid}/{fieldName}".
 */
export type ReadabilityAnalysisResult = Record<string, ReadabilityFieldResult>

/**
 * Interface for a readability analyzer.
 *
 * Adapters can provide a custom analyzer via `getReadabilityAnalyzer`
 * on an adapter extension; the built-in implementation lives in the
 * `@blokkli/readability` sub-module.
 *
 * Every per-language method takes the active langcode explicitly — analyzers
 * are stateless with respect to language. The `analyze` method is responsible
 * for any async setup (e.g. loading language data on first call).
 */
export type ReadabilityAnalyzer = {
  id: string
  label?: string | ((langcode: string) => string)
  description?: string
  supportedLanguages?: string[]

  /**
   * Short label for the primary score metric in the given language
   * (e.g. "LIX", "Gulpease", "CEFR").
   */
  scoreLabel(langcode: string): string

  /**
   * Minimum word count required to produce a confident score in the given
   * language.
   */
  minWordsForConfidence?(langcode: string): number

  /**
   * Score an array of plain-text strings.
   * Returns one primary score per input text (null if not scorable).
   * Implementations may perform lazy setup on first call.
   */
  analyze(texts: string[], langcode: string): Promise<(number | null)[]>

  /**
   * Classify a score into a readability band.
   */
  classifyBand(score: number, langcode: string): ReadabilityBand

  /**
   * Determine the impact severity for a score.
   */
  impactForScore(score: number, langcode: string): AnalyzeImpact

  /**
   * Return context text for the agent prompt (e.g. score reference table).
   */
  getAgentContext(langcode: string): string

  /**
   * Optional display formatting for a score value.
   */
  formatScore?(value: number, langcode: string): string

  /**
   * Return scale information for visualizing score bands.
   *
   * - `thresholds`: The two boundary values between easy/ok and ok/hard.
   *   Listed in ascending order (lower value first).
   * - `direction`: Whether higher scores mean easier or harder text.
   * - `scaleMin`/`scaleMax`: The visual range of the score bar.
   */
  getScaleInfo?(langcode: string): {
    thresholds: [number, number]
    direction: 'higher_easier' | 'higher_harder'
    scaleMin: number
    scaleMax: number
  }
}
