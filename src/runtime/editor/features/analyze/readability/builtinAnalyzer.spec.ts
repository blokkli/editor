import { describe, it, expect, beforeAll } from 'vitest'
import { createBuiltinReadabilityAnalyzer } from './builtinAnalyzer'
import type { ReadabilityAnalyzer } from './types'

describe('createBuiltinReadabilityAnalyzer', () => {
  let analyzer: ReadabilityAnalyzer

  beforeAll(async () => {
    analyzer = createBuiltinReadabilityAnalyzer()
    await analyzer.init!('en')
  })

  describe('analyze', () => {
    it('returns a score for a sufficiently long text', async () => {
      const texts = [
        'The quick brown fox jumps over the lazy dog several times today.',
      ]
      const results = await analyzer.analyze(texts, 'en')
      expect(results).toHaveLength(1)
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('returns null for text shorter than min words', async () => {
      const results = await analyzer.analyze(['Too short.'], 'en')
      expect(results).toHaveLength(1)
      expect(results[0]).toBeNull()
    })

    it('returns null for empty text', async () => {
      const results = await analyzer.analyze([''], 'en')
      expect(results[0]).toBeNull()
    })

    it('returns null for unsupported language', async () => {
      const results = await analyzer.analyze(
        ['This is a long enough sentence for testing purposes.'],
        'zh',
      )
      expect(results[0]).toBeNull()
    })

    it('handles batch of multiple texts', async () => {
      const texts = [
        'The quick brown fox jumps over the lazy dog several times today.',
        'Short.',
        'Another sentence that is long enough to be analyzed by the readability tool.',
      ]
      const results = await analyzer.analyze(texts, 'en')
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).toBeNull() // too short
      expect(results[2]).not.toBeNull()
    })

    it('produces a LIX score for English', async () => {
      const results = await analyzer.analyze(
        [
          'Complex governmental regulations frequently necessitate extraordinary administrative oversight mechanisms that substantially increase bureaucratic operational expenditures.',
        ],
        'en',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('produces a Gulpease score for Italian', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      const results = await itAnalyzer.analyze(
        [
          'Le complesse normative governative necessitano frequentemente di straordinari meccanismi di supervisione amministrativa.',
        ],
        'it',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('produces a WSTF score for German', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      const results = await deAnalyzer.analyze(
        [
          'Die komplexen Verwaltungsvorschriften erfordern häufig außerordentliche Aufsichtsmechanismen, die den bürokratischen Aufwand erheblich steigern.',
        ],
        'de',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('produces a LIX score for French', async () => {
      const frAnalyzer = createBuiltinReadabilityAnalyzer()
      await frAnalyzer.init!('fr')
      const results = await frAnalyzer.analyze(
        [
          'Les réglementations gouvernementales complexes nécessitent fréquemment des mécanismes de surveillance administrative extraordinaires.',
        ],
        'fr',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })
  })

  describe('scoreLabel', () => {
    it('returns LIX for English', () => {
      expect(analyzer.scoreLabel).toBe('LIX')
    })

    it('returns Gulpease for Italian', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      expect(itAnalyzer.scoreLabel).toBe('Gulpease')
    })

    it('returns WSTF for German', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      expect(deAnalyzer.scoreLabel).toBe('WSTF')
    })

    it('returns LIX for French', async () => {
      const frAnalyzer = createBuiltinReadabilityAnalyzer()
      await frAnalyzer.init!('fr')
      expect(frAnalyzer.scoreLabel).toBe('LIX')
    })
  })

  describe('classifyBand', () => {
    it('classifies low LIX as easy', () => {
      expect(analyzer.classifyBand(30, 'en')).toBe('easy')
    })

    it('classifies medium LIX as ok', () => {
      expect(analyzer.classifyBand(50, 'en')).toBe('ok')
    })

    it('classifies high LIX as hard', () => {
      expect(analyzer.classifyBand(65, 'en')).toBe('hard')
    })

    it('uses Gulpease thresholds for Italian', () => {
      expect(analyzer.classifyBand(85, 'it')).toBe('easy')
      expect(analyzer.classifyBand(70, 'it')).toBe('ok')
      expect(analyzer.classifyBand(50, 'it')).toBe('hard')
    })

    it('uses WSTF thresholds for German', () => {
      expect(analyzer.classifyBand(5, 'de')).toBe('easy')
      expect(analyzer.classifyBand(6, 'de')).toBe('easy')
      expect(analyzer.classifyBand(8, 'de')).toBe('ok')
      expect(analyzer.classifyBand(10, 'de')).toBe('ok')
      expect(analyzer.classifyBand(11, 'de')).toBe('hard')
    })

    it('uses LIX thresholds for French', () => {
      expect(analyzer.classifyBand(30, 'fr')).toBe('easy')
      expect(analyzer.classifyBand(50, 'fr')).toBe('ok')
      expect(analyzer.classifyBand(65, 'fr')).toBe('hard')
    })
  })

  describe('impactForScore', () => {
    it('returns critical for LIX >= 70', () => {
      expect(analyzer.impactForScore(75)).toBe('critical')
    })

    it('returns serious for LIX >= 60', () => {
      expect(analyzer.impactForScore(65)).toBe('serious')
    })

    it('returns moderate for LIX >= 50', () => {
      expect(analyzer.impactForScore(55)).toBe('moderate')
    })

    it('returns minor for LIX < 50', () => {
      expect(analyzer.impactForScore(35)).toBe('minor')
    })

    it('returns critical for Italian Gulpease < 40', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      expect(itAnalyzer.impactForScore(30)).toBe('critical')
    })

    it('returns serious for Italian Gulpease < 50', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      expect(itAnalyzer.impactForScore(45)).toBe('serious')
    })

    it('returns minor for Italian Gulpease >= 60', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      expect(itAnalyzer.impactForScore(70)).toBe('minor')
    })

    it('returns critical for German WSTF >= 12', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      expect(deAnalyzer.impactForScore(13)).toBe('critical')
    })

    it('returns serious for German WSTF >= 10', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      expect(deAnalyzer.impactForScore(11)).toBe('serious')
    })

    it('returns moderate for German WSTF >= 8', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      expect(deAnalyzer.impactForScore(9)).toBe('moderate')
    })

    it('returns minor for German WSTF < 8', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      expect(deAnalyzer.impactForScore(5)).toBe('minor')
    })
  })

  describe('getAgentContext', () => {
    it('returns LIX reference text for English', () => {
      const context = analyzer.getAgentContext()
      expect(context).toContain('LIX Score Reference')
      expect(context).toContain('Very easy')
      expect(context).toContain('Critical')
    })

    it('returns Gulpease reference text for Italian', async () => {
      const itAnalyzer = createBuiltinReadabilityAnalyzer()
      await itAnalyzer.init!('it')
      const context = itAnalyzer.getAgentContext()
      expect(context).toContain('Gulpease Score Reference')
      expect(context).toContain('Very easy')
      expect(context).toContain('Critical')
    })

    it('returns WSTF reference text for German', async () => {
      const deAnalyzer = createBuiltinReadabilityAnalyzer()
      await deAnalyzer.init!('de')
      const context = deAnalyzer.getAgentContext()
      expect(context).toContain('WSTF Score Reference')
      expect(context).toContain('primary school')
      expect(context).toContain('Critical')
    })

    it('returns LIX reference text for French', async () => {
      const frAnalyzer = createBuiltinReadabilityAnalyzer()
      await frAnalyzer.init!('fr')
      const context = frAnalyzer.getAgentContext()
      expect(context).toContain('LIX Score Reference')
      expect(context).toContain('Very easy')
    })
  })
})
