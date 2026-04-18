import { ref, readonly, computed, type ComputedRef, type Ref } from '#imports'
import type { AdapterContext } from '#blokkli/editor/adapter'
import type { AdaptersProvider } from './adapters'
import type { DirectiveProvider } from './directive'
import type { FieldValueProvider, TextFieldValue } from './fieldValue'
import { chunkHtml } from '../features/analyze/readability/chunkHtml'
import type {
  ReadabilityAnalysisResult,
  ReadabilityAnalyzer,
  ReadabilityChunkResult,
} from '../features/analyze/readability/types'
// Side-effect import to register adapter type augmentation.
import '../features/analyze/readability/adapterTypes'

type ReadabilityScaleInfo = NonNullable<
  ReturnType<NonNullable<ReadabilityAnalyzer['getScaleInfo']>>
>

export type ReadabilityProvider = {
  /**
   * Whether a readability analyzer is registered and usable.
   *
   * Resolved at provider construction time. `true` when an adapter extension
   * supplied `getReadabilityAnalyzer` (typically via the `@blokkli/readability`
   * sub-module), `false` otherwise. Features that render readability UI
   * should gate on this flag; method calls are safe no-ops when false.
   */
  isAvailable: Readonly<Ref<boolean>>

  /**
   * Label of the primary score metric for the current language
   * (e.g. "LIX", "Gulpease", "CEFR"). Empty string when no analyzer is
   * available.
   */
  scoreLabel: ComputedRef<string>

  /**
   * Minimum word count required for a confident score in the current
   * language. `0` when no analyzer is available.
   */
  minWordsForConfidence: ComputedRef<number>

  analyzeAllFields: () => Promise<ReadabilityAnalysisResult>
  analyzeText: (
    text: string,
    langcode: string,
    fieldType?: 'plain' | 'markup',
  ) => Promise<ReadabilityChunkResult[]>
  analyzeFieldValues: (
    fields: TextFieldValue[],
  ) => Promise<ReadabilityAnalysisResult>
  getAgentContext: () => string
  formatScore: (value: number) => string

  /**
   * Return scale information for visualizing score bands, or `null` if no
   * analyzer is available (or it does not provide one).
   */
  getScaleInfo: (langcode: string) => ReadabilityScaleInfo | null

  /**
   * Find the DOM element for a specific editable field.
   * Used by the analyzer to scope DOM highlighting to the correct block.
   */
  getFieldElement: (uuid: string, fieldName: string) => HTMLElement | undefined
}

export default async function readabilityProvider(
  adapters: AdaptersProvider,
  context: ComputedRef<AdapterContext>,
  directive: DirectiveProvider,
  fieldValue: FieldValueProvider,
): Promise<ReadabilityProvider> {
  const list = await adapters.getAggregated('getReadabilityAnalyzer')
  const analyzer: ReadabilityAnalyzer | null =
    (list[0] as ReadabilityAnalyzer | undefined) ?? null

  const isAvailable = ref(analyzer !== null)

  const scoreLabel = computed(
    () => analyzer?.scoreLabel(context.value.language) ?? '',
  )

  const minWordsForConfidence = computed(
    () => analyzer?.minWordsForConfidence?.(context.value.language) ?? 0,
  )

  async function analyzeFieldValues(
    fields: TextFieldValue[],
  ): Promise<ReadabilityAnalysisResult> {
    if (!analyzer) return {}
    const langcode = context.value.language

    // Chunk all fields and collect texts for batch analysis.
    const fieldEntries: Array<{
      key: string
      field: TextFieldValue
      chunks: Array<{ text: string; html?: string }>
    }> = []
    const allTexts: string[] = []
    const textToIndex: number[] = [] // Maps each text to its fieldEntry index.

    for (const field of fields) {
      const key = `${field.uuid}/${field.fieldName}`
      const chunks = chunkHtml(field.value, field.fieldType)
      const entry = { key, field, chunks }
      const entryIndex = fieldEntries.length
      fieldEntries.push(entry)
      for (const chunk of chunks) {
        allTexts.push(chunk.text)
        textToIndex.push(entryIndex)
      }
    }

    const scores = await analyzer.analyze(allTexts, langcode)

    const result: ReadabilityAnalysisResult = {}
    let textIndex = 0
    for (const entry of fieldEntries) {
      const chunkResults: ReadabilityChunkResult[] = []
      for (const chunk of entry.chunks) {
        const score = scores[textIndex] ?? null
        textIndex++
        chunkResults.push({
          text: chunk.text,
          html: chunk.html,
          score,
          band: score != null ? analyzer.classifyBand(score, langcode) : null,
          impact:
            score != null ? analyzer.impactForScore(score, langcode) : null,
        })
      }
      result[entry.key] = {
        rawValue: entry.field.value,
        fieldType: entry.field.fieldType,
        chunks: chunkResults,
      }
    }

    return result
  }

  async function analyzeAllFields(): Promise<ReadabilityAnalysisResult> {
    if (!analyzer) return {}
    const fields = fieldValue.getTextFieldValues()
    return analyzeFieldValues(fields)
  }

  async function analyzeText(
    text: string,
    langcode: string,
    fieldType: 'plain' | 'markup' = 'plain',
  ): Promise<ReadabilityChunkResult[]> {
    if (!analyzer) return []
    const chunks = chunkHtml(text, fieldType)
    if (chunks.length === 0) return []

    const texts = chunks.map((c) => c.text)
    const scores = await analyzer.analyze(texts, langcode)

    const results: ReadabilityChunkResult[] = []
    for (let i = 0; i < chunks.length; i++) {
      const score = scores[i] ?? null
      results.push({
        text: chunks[i]!.text,
        html: chunks[i]!.html,
        score,
        band: score != null ? analyzer.classifyBand(score, langcode) : null,
        impact: score != null ? analyzer.impactForScore(score, langcode) : null,
      })
    }
    return results
  }

  function getAgentContext(): string {
    return analyzer?.getAgentContext(context.value.language) ?? ''
  }

  function getFieldElement(
    uuid: string,
    fieldName: string,
  ): HTMLElement | undefined {
    const editables = directive.getEditablesForBlock(uuid)
    const editable = editables.find((e) => e.fieldName === fieldName)
    if (editable) {
      return directive.findEditableElement(fieldName, editable)
    }
  }

  function formatScore(value: number): string {
    if (analyzer?.formatScore) {
      return analyzer.formatScore(value, context.value.language)
    }
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(1)
      : String(value)
  }

  function getScaleInfo(langcode: string): ReadabilityScaleInfo | null {
    return analyzer?.getScaleInfo?.(langcode) ?? null
  }

  return {
    isAvailable: readonly(isAvailable),
    scoreLabel,
    minWordsForConfidence,
    analyzeAllFields,
    analyzeText,
    analyzeFieldValues,
    getAgentContext,
    formatScore,
    getScaleInfo,
    getFieldElement,
  }
}
