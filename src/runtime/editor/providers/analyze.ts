import { ref, type Ref, type ComputedRef } from '#imports'
import type { AdaptersProvider } from './adapters'
import type { StateProvider } from './state'
import type { UiProvider } from './ui'
import type { ReadabilityProvider } from './readability'
import type { FieldValueProvider } from './fieldValue'
import type { EntityContext } from '#blokkli/types'
import type { AdapterContext } from '#blokkli/editor/adapter'
import type { TextProvider } from './texts'
import type {
  AnalyzeNode,
  AnalyzeResult,
  Analyzer,
  AnalyzerType,
} from '../features/analyze/analyzers/types'
import { AnalyzerContext } from '../features/analyze/analyzers/helpers/Context'
import { normalizeToArray } from '../features/analyze/analyzers/helpers/normalizeArray'
import { validationsAnalyzer } from '../features/analyze/analyzers/defaults/validations'

const DEFAULT_ANALYZERS: Analyzer[] = [validationsAnalyzer]

export type AnalyzeProvider = {
  /**
   * All available analyzers, fetched once from adapters.
   * Empty array until initialized.
   */
  analyzers: Readonly<Ref<Analyzer[]>>

  /**
   * Whether analyzers have been fetched and initialized.
   */
  isInitialized: Readonly<Ref<boolean>>

  /**
   * Fetch analyzers and call init() on each one. Idempotent.
   */
  ensureInitialized: () => Promise<void>

  /**
   * Create an AnalyzerContext scoped to the given element.
   */
  createContext: (element: HTMLElement, signal?: AbortSignal) => AnalyzerContext

  /**
   * Run a single analyzer and return its results as a flat array.
   */
  runAnalyzer: (
    analyzer: Analyzer,
    context: AnalyzerContext,
  ) => Promise<AnalyzeResult[]>

  /**
   * Run analyzeText on all analyzers that support it.
   * Optionally filter by analyzer type.
   * Returns nodes per analyzer per text.
   */
  runOnTexts: (
    texts: string[],
    analyzerType?: AnalyzerType,
  ) => Promise<
    Array<{
      analyzerId: string
      analyzerLabel?: string
      text: string
      nodes: AnalyzeNode[]
    }>
  >
}

export default function analyzeProvider(
  adapters: AdaptersProvider,
  state: StateProvider,
  ui: UiProvider,
  context: ComputedRef<AdapterContext>,
  $t: TextProvider,
  readability: ReadabilityProvider,
  entity: ComputedRef<EntityContext>,
  fieldValue: FieldValueProvider,
): AnalyzeProvider {
  const analyzers = ref<Analyzer[]>([])
  const isInitialized = ref(false)
  let initPromise: Promise<void> | null = null

  async function doInit(): Promise<void> {
    const fetched = await adapters.getAggregated('getAnalyzers')
    const all: Analyzer[] = [...DEFAULT_ANALYZERS, ...fetched]

    // Create a context for initialization.
    const initCtx = new AnalyzerContext(
      context.value.language,
      ui.interfaceLanguage.value,
      ui.providerElement,
      state,
      $t,
      undefined,
      readability,
      entity.value,
      fieldValue,
    )

    await Promise.all(
      all.map(async (analyzer) => {
        if (analyzer.init) {
          await analyzer.init(initCtx)
        }
      }),
    )

    analyzers.value = all
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

  function createContext(
    element: HTMLElement,
    signal?: AbortSignal,
  ): AnalyzerContext {
    return new AnalyzerContext(
      context.value.language,
      ui.interfaceLanguage.value,
      element,
      state,
      $t,
      signal,
      readability,
      entity.value,
      fieldValue,
    )
  }

  async function runAnalyzer(
    analyzer: Analyzer,
    ctx: AnalyzerContext,
  ): Promise<AnalyzeResult[]> {
    return normalizeToArray(analyzer.run(ctx))
  }

  async function runOnTexts(
    texts: string[],
    analyzerType?: AnalyzerType,
  ): Promise<
    Array<{
      analyzerId: string
      analyzerLabel?: string
      text: string
      nodes: AnalyzeNode[]
    }>
  > {
    await ensureInitialized()

    let textAnalyzers = analyzers.value.filter((a) => a.analyzeText)
    if (analyzerType) {
      textAnalyzers = textAnalyzers.filter((a) => a.type === analyzerType)
    }
    const results: Array<{
      analyzerId: string
      analyzerLabel?: string
      text: string
      nodes: AnalyzeNode[]
    }> = []

    for (const text of texts) {
      for (const analyzer of textAnalyzers) {
        const nodes = await analyzer.analyzeText!(text, context.value.language)

        const label =
          typeof analyzer.label === 'function'
            ? analyzer.label(context.value.language, $t)
            : analyzer.label

        results.push({
          analyzerId: analyzer.id,
          analyzerLabel: label,
          text,
          nodes,
        })
      }
    }

    return results
  }

  return {
    analyzers,
    isInitialized,
    ensureInitialized,
    createContext,
    runAnalyzer,
    runOnTexts,
  }
}
