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
 * One analyzer is active at a time. The built-in default uses
 * LIX/CLI/ARI/Gulpease. Adapters can override with a custom implementation
 * (e.g. CEFR via API).
 */
export type ReadabilityAnalyzer = {
  id: string
  label?: string | ((langcode: string) => string)
  description?: string
  supportedLanguages?: string[]
  minWordsForConfidence?: number

  /**
   * Short label for the primary score metric (e.g. "LIX", "Gulpease", "CEFR").
   * Used by the UI to display scores like "LIX: 45".
   */
  scoreLabel: string

  /**
   * Optional initialization (e.g. lazy-load a library).
   */
  init?(langcode: string): void | Promise<void>

  /**
   * Score an array of plain-text strings.
   * Returns one primary score per input text (null if not scorable).
   */
  analyze(texts: string[], langcode: string): Promise<(number | null)[]>

  /**
   * Classify a score into a readability band.
   */
  classifyBand(score: number, langcode: string): ReadabilityBand

  /**
   * Determine the impact severity for a score.
   */
  impactForScore(score: number): AnalyzeImpact

  /**
   * Return context text for the agent prompt (e.g. LIX reference table).
   */
  getAgentContext(): string

  /**
   * Optional display formatting for a score value.
   */
  formatScore?(value: number): string

  /**
   * Return scale information for visualizing score bands.
   * Used by the UI to render a score bar with thresholds.
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
