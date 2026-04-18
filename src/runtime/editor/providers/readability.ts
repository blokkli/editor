import { ref, readonly, type ComputedRef, type Ref } from '#imports'
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
   * Whether the readability analyzer has been loaded and initialized.
   *
   * Metadata refs (`scoreLabel`, `minWordsForConfidence`) and all methods
   * require `ensureInitialized()` to have completed. Sync methods throw if
   * called beforehand.
   */
  isInitialized: Readonly<Ref<boolean>>

  /**
   * Label of the primary score metric (e.g. "LIX", "Gulpease", "CEFR").
   * Empty until `ensureInitialized()` completes.
   */
  scoreLabel: Readonly<Ref<string>>

  /**
   * Minimum word count required for a confident score.
   * `0` until `ensureInitialized()` completes.
   */
  minWordsForConfidence: Readonly<Ref<number>>

  /**
   * Load and initialize the active analyzer (adapter-provided or built-in).
   *
   * Must be awaited at least once before any other method or metadata ref
   * is read. Idempotent: subsequent calls return the same promise.
   */
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
   * Return scale information for visualizing score bands, or `null` if the
   * analyzer does not provide one.
   */
  getScaleInfo: (langcode: string) => ReadabilityScaleInfo | null

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
  const isInitialized = ref(false)
  const scoreLabel = ref('')
  const minWordsForConfidence = ref(0)
  let analyzer: ReadabilityAnalyzer | null = null
  let initPromise: Promise<void> | null = null

  async function doInit(): Promise<void> {
    // The analyzer is provided by the readability sub-module via the
    // `getReadabilityAnalyzer` adapter extension. If no module registered one,
    // `analyzer` stays null — all analyzer-backed methods will then throw.
    const registered = await adapters.getAggregated('getReadabilityAnalyzer')
    if (registered.length > 0) {
      analyzer = registered[0] as ReadabilityAnalyzer
      if (analyzer.init) {
        await analyzer.init(context.value.language)
      }
      scoreLabel.value = analyzer.scoreLabel
      minWordsForConfidence.value = analyzer.minWordsForConfidence ?? 100
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

  function requireAnalyzer(): ReadabilityAnalyzer {
    if (!analyzer) {
      throw new Error(
        'Readability analyzer is not initialized. Call await readability.ensureInitialized() first.',
      )
    }
    return analyzer
  }

  async function analyzeFieldValues(
    fields: TextFieldValue[],
  ): Promise<ReadabilityAnalysisResult> {
    const a = requireAnalyzer()
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

    const scores = await a.analyze(allTexts, langcode)

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
          band: score != null ? a.classifyBand(score, langcode) : null,
          impact: score != null ? a.impactForScore(score) : null,
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
    const fields = fieldValue.getTextFieldValues()
    return analyzeFieldValues(fields)
  }

  async function analyzeText(
    text: string,
    langcode: string,
    fieldType: 'plain' | 'markup' = 'plain',
  ): Promise<ReadabilityChunkResult[]> {
    const a = requireAnalyzer()
    const chunks = chunkHtml(text, fieldType)
    if (chunks.length === 0) return []

    const texts = chunks.map((c) => c.text)
    const scores = await a.analyze(texts, langcode)

    const results: ReadabilityChunkResult[] = []
    for (let i = 0; i < chunks.length; i++) {
      const score = scores[i] ?? null
      results.push({
        text: chunks[i]!.text,
        html: chunks[i]!.html,
        score,
        band: score != null ? a.classifyBand(score, langcode) : null,
        impact: score != null ? a.impactForScore(score) : null,
      })
    }
    return results
  }

  function getAgentContext(): string {
    return requireAnalyzer().getAgentContext()
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
    const a = requireAnalyzer()
    if (a.formatScore) {
      return a.formatScore(value)
    }
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(1)
      : String(value)
  }

  function getScaleInfo(langcode: string): ReadabilityScaleInfo | null {
    const a = requireAnalyzer()
    return a.getScaleInfo?.(langcode) ?? null
  }

  return {
    isInitialized: readonly(isInitialized),
    scoreLabel: readonly(scoreLabel),
    minWordsForConfidence: readonly(minWordsForConfidence),
    ensureInitialized,
    analyzeAllFields,
    analyzeText,
    analyzeFieldValues,
    getAgentContext,
    formatScore,
    getScaleInfo,
    getFieldElement,
  }
}
