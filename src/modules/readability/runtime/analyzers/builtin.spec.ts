import { describe, it, expect } from 'vitest'
import { createBuiltinReadabilityAnalyzer } from './builtin'

const analyzer = createBuiltinReadabilityAnalyzer()

describe('createBuiltinReadabilityAnalyzer', () => {
  describe('analyze', () => {
    it('returns a score for a sufficiently long text', async () => {
      const texts = [
        'The quick brown fox jumps over the lazy dog several times today while the sun shines brightly above the green hills.',
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
        'The quick brown fox jumps over the lazy dog several times today while the sun shines brightly above the green hills.',
        'Short.',
        'Another sentence that is long enough to be analyzed by the readability tool and contains many words for testing purposes.',
      ]
      const results = await analyzer.analyze(texts, 'en')
      expect(results).toHaveLength(3)
      expect(results[0]).not.toBeNull()
      expect(results[1]).toBeNull() // too short
      expect(results[2]).not.toBeNull()
    })

    it('produces a Flesch Reading Ease score for English', async () => {
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
      const results = await analyzer.analyze(
        [
          'Le complesse normative governative necessitano frequentemente di straordinari meccanismi di supervisione amministrativa.',
        ],
        'it',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('produces a WSTF score for German', async () => {
      const results = await analyzer.analyze(
        [
          'Die komplexen Verwaltungsvorschriften erfordern häufig ausserordentliche Aufsichtsmechanismen, die den bürokratischen Aufwand erheblich steigern.',
        ],
        'de',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('produces a LIX score for French', async () => {
      const results = await analyzer.analyze(
        [
          'Les réglementations gouvernementales complexes nécessitent fréquemment des mécanismes de surveillance administrative extraordinaires.',
        ],
        'fr',
      )
      expect(results[0]).not.toBeNull()
      expect(typeof results[0]).toBe('number')
    })

    it('classifies a plain English text in the easy FRE band', async () => {
      const results = await analyzer.analyze(
        [
          'The cat sat on the mat. The dog ran to the park. The sun was bright and warm. The kids played in the yard.',
        ],
        'en',
      )
      expect(results[0]).not.toBeNull()
      expect(analyzer.classifyBand(results[0] as number, 'en')).toBe('easy')
    })

    it('classifies a simple German text in the easy WSTF band', async () => {
      const results = await analyzer.analyze(
        [
          'Die Katze sitzt auf der Matte. Der Hund rennt in den Park. Die Sonne scheint hell und warm. Die Kinder spielen im Garten.',
        ],
        'de',
      )
      expect(results[0]).not.toBeNull()
      expect(analyzer.classifyBand(results[0] as number, 'de')).toBe('easy')
    })
  })

  describe('scoreLabel', () => {
    it('returns CEFR for English', () => {
      expect(analyzer.scoreLabel('en')).toBe('CEFR')
    })

    it('returns Gulpease for Italian', () => {
      expect(analyzer.scoreLabel('it')).toBe('Gulpease')
    })

    it('returns WSTF for German', () => {
      expect(analyzer.scoreLabel('de')).toBe('WSTF')
    })

    it('returns LIX for French', () => {
      expect(analyzer.scoreLabel('fr')).toBe('LIX')
    })
  })

  describe('classifyBand', () => {
    it('classifies high FRE as easy', () => {
      expect(analyzer.classifyBand(75, 'en')).toBe('easy')
    })

    it('classifies medium FRE as ok (C1 band)', () => {
      expect(analyzer.classifyBand(55, 'en')).toBe('ok')
    })

    it('classifies low FRE as hard (C2 band)', () => {
      expect(analyzer.classifyBand(45, 'en')).toBe('hard')
      expect(analyzer.classifyBand(20, 'en')).toBe('hard')
    })

    it('uses Gulpease thresholds for Italian', () => {
      expect(analyzer.classifyBand(85, 'it')).toBe('easy')
      expect(analyzer.classifyBand(70, 'it')).toBe('ok')
      expect(analyzer.classifyBand(50, 'it')).toBe('hard')
    })

    it('uses WSTF thresholds for German', () => {
      expect(analyzer.classifyBand(5, 'de')).toBe('easy')
      expect(analyzer.classifyBand(12, 'de')).toBe('easy')
      expect(analyzer.classifyBand(15, 'de')).toBe('easy')
      expect(analyzer.classifyBand(16, 'de')).toBe('ok')
      expect(analyzer.classifyBand(18, 'de')).toBe('ok')
      expect(analyzer.classifyBand(19, 'de')).toBe('hard')
    })

    it('uses LIX thresholds for French', () => {
      expect(analyzer.classifyBand(30, 'fr')).toBe('easy')
      expect(analyzer.classifyBand(50, 'fr')).toBe('ok')
      expect(analyzer.classifyBand(65, 'fr')).toBe('hard')
    })
  })

  describe('impactForScore', () => {
    it('returns critical for FRE < 10', () => {
      expect(analyzer.impactForScore(5, 'en')).toBe('critical')
    })

    it('returns serious for FRE < 25', () => {
      expect(analyzer.impactForScore(20, 'en')).toBe('serious')
    })

    it('returns moderate for FRE < 40', () => {
      expect(analyzer.impactForScore(35, 'en')).toBe('moderate')
    })

    it('returns minor for FRE >= 40', () => {
      expect(analyzer.impactForScore(65, 'en')).toBe('minor')
    })

    it('returns critical for Italian Gulpease < 40', () => {
      expect(analyzer.impactForScore(30, 'it')).toBe('critical')
    })

    it('returns serious for Italian Gulpease < 50', () => {
      expect(analyzer.impactForScore(45, 'it')).toBe('serious')
    })

    it('returns minor for Italian Gulpease >= 60', () => {
      expect(analyzer.impactForScore(70, 'it')).toBe('minor')
    })

    it('returns critical for German WSTF >= 24', () => {
      expect(analyzer.impactForScore(25, 'de')).toBe('critical')
    })

    it('returns serious for German WSTF >= 20', () => {
      expect(analyzer.impactForScore(21, 'de')).toBe('serious')
    })

    it('returns moderate for German WSTF >= 16', () => {
      expect(analyzer.impactForScore(17, 'de')).toBe('moderate')
    })

    it('returns minor for German WSTF < 16', () => {
      expect(analyzer.impactForScore(10, 'de')).toBe('minor')
    })
  })

  describe('getAgentContext', () => {
    it('returns CEFR reference text for English', () => {
      const context = analyzer.getAgentContext('en')
      expect(context).toContain('CEFR Score Reference')
      expect(context).toContain('A1')
      expect(context).toContain('C2')
    })

    it('returns Gulpease reference text for Italian', () => {
      const context = analyzer.getAgentContext('it')
      expect(context).toContain('Gulpease Score Reference')
      expect(context).toContain('Very easy')
      expect(context).toContain('Critical')
    })

    it('returns WSTF reference text for German', () => {
      const context = analyzer.getAgentContext('de')
      expect(context).toContain('WSTF Score Reference')
      expect(context).toContain('Very easy')
      expect(context).toContain('Critical')
    })

    it('returns LIX reference text for French', () => {
      const context = analyzer.getAgentContext('fr')
      expect(context).toContain('LIX Score Reference')
      expect(context).toContain('Very easy')
    })
  })
})
