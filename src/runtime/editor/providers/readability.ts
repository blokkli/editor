import { ref, type ComputedRef, type Ref } from '#imports'
import type { AdapterContext } from '#blokkli/editor/adapter'
import type { AdaptersProvider } from './adapters'
import type { DirectiveProvider } from './directive'
import type { FieldValueProvider, TextFieldValue } from './fieldValue'
import { chunkHtml } from '../features/analyze/readability/chunkHtml'
import { createBuiltinReadabilityAnalyzer } from '../features/analyze/readability/builtinAnalyzer'
import type {
  ReadabilityAnalysisResult,
  ReadabilityAnalyzer,
  ReadabilityChunkResult,
} from '../features/analyze/readability/types'
// Side-effect import to register adapter type augmentation.
import '../features/analyze/readability/adapterTypes'

export type ReadabilityProvider = {
  analyzer: Readonly<Ref<ReadabilityAnalyzer>>
  isInitialized: Readonly<Ref<boolean>>
  ensureInitialized: () => Promise<void>
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
   * Find the DOM element for a specific editable field.
   * Used by the analyzer to scope DOM highlighting to the correct block.
   */
  getFieldElement: (uuid: string, fieldName: string) => HTMLElement | undefined
}

export default function readabilityProvider(
  adapters: AdaptersProvider,
  context: ComputedRef<AdapterContext>,
  directive: DirectiveProvider,
  fieldValue: FieldValueProvider,
): ReadabilityProvider {
  const builtin = createBuiltinReadabilityAnalyzer()
  const analyzer = ref<ReadabilityAnalyzer>(builtin)
  const isInitialized = ref(false)
  let initPromise: Promise<void> | null = null

  async function doInit(): Promise<void> {
    // Check if the adapter provides a custom readability analyzer.
    const customAnalyzers = await adapters.getAggregated(
      'getReadabilityAnalyzer',
    )
    if (customAnalyzers.length > 0) {
      analyzer.value = customAnalyzers[0] as ReadabilityAnalyzer
    }

    const a = analyzer.value
    if (a.init) {
      await a.init(context.value.language)
    }
    isInitialized.value = true
  }

  function ensureInitialized(): Promise<void> {
    if (isInitialized.value) {
      return Promise.resolve()
    }
    if (!initPromise) {
      initPromise = doInit()
    }
    return initPromise
  }

  async function analyzeFieldValues(
    fields: TextFieldValue[],
  ): Promise<ReadabilityAnalysisResult> {
    await ensureInitialized()
    const a = analyzer.value
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

    // Batch analyze all texts at once.
    const scores = await a.analyze(allTexts, langcode)

    // Build result by mapping scores back to fields/chunks.
    const result: ReadabilityAnalysisResult = {}
    let textIndex = 0
    for (const entry of fieldEntries) {
      const chunkResults: ReadabilityChunkResult[] = []
      for (const chunk of entry.chunks) {
        const score = scores[textIndex]
        textIndex++
        if (score != null) {
          chunkResults.push({
            text: chunk.text,
            html: chunk.html,
            score,
            band: a.classifyBand(score, langcode),
            impact: a.impactForScore(score),
          })
        }
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
    const fields = await fieldValue.getTextFieldValues()
    return analyzeFieldValues(fields)
  }

  async function analyzeText(
    text: string,
    langcode: string,
    fieldType: 'plain' | 'markup' = 'plain',
  ): Promise<ReadabilityChunkResult[]> {
    await ensureInitialized()
    const a = analyzer.value
    const chunks = chunkHtml(text, fieldType)
    if (chunks.length === 0) return []

    const texts = chunks.map((c) => c.text)
    const scores = await a.analyze(texts, langcode)

    const results: ReadabilityChunkResult[] = []
    for (let i = 0; i < chunks.length; i++) {
      const score = scores[i]
      if (score != null) {
        results.push({
          text: chunks[i]!.text,
          html: chunks[i]!.html,
          score,
          band: a.classifyBand(score, langcode),
          impact: a.impactForScore(score),
        })
      }
    }
    return results
  }

  function getAgentContext(): string {
    return analyzer.value.getAgentContext()
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
    const a = analyzer.value
    if (a.formatScore) {
      return a.formatScore(value)
    }
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(1)
      : String(value)
  }

  return {
    analyzer,
    isInitialized,
    ensureInitialized,
    analyzeAllFields,
    analyzeText,
    analyzeFieldValues,
    getAgentContext,
    formatScore,
    getFieldElement,
  }
}
