import type { AnalyzerContext } from './helpers/Context'

export type AnalyzeStatus = 'pass' | 'incomplete' | 'inapplicable' | 'violation'
export type AnalyzeImpact = 'minor' | 'moderate' | 'serious' | 'critical'
export type AnalyzeCategory = 'accessibility' | 'seo' | 'text' | 'content'

export type AnalyzeNodeTarget = string | HTMLElement | { uuid: string }
export type AnalyzeNodeTargetMapped = {
  target: AnalyzeNodeTarget
  globalIndex: number
}

export type AnalyzeNode = {
  description?: string
  impact?: AnalyzeImpact
  /**
   * Optional numeric scores for this node (e.g. readability indices).
   */
  scores?: Record<string, number>
  /**
   * An array of either:
   * - string: a valid selector
   * - HTMLElement: the DOM node
   *  - object: An object containing the UUID of a block
   */
  targets: AnalyzeNodeTarget | AnalyzeNodeTarget[]
}

export type AnalyzeNodeMapped = Omit<AnalyzeNode, 'targets'> & {
  targets: AnalyzeNodeTargetMapped[]
}

export type AnalyzeResult = {
  id: string
  title: string
  category: AnalyzeCategory
  description: string
  link?: string
  status: AnalyzeStatus
  nodes: AnalyzeNode | AnalyzeNode[]
  impact?: AnalyzeImpact

  /**
   * If true, the total summary score will be calculated for each target element.
   */
  scoreTargets?: boolean
}

export type AnalyzeResultMapped = Omit<AnalyzeResult, 'nodes'> & {
  plugin: string
  nodes: AnalyzeNodeMapped[]
}

export type Analyzer = {
  id: string

  label?: string | ((langcode: string) => string)

  description?: string | ((langcode: string) => string)

  /**
   * If true, the raw page (without editor UI) is required for this analyzer.
   */
  requireRawPage?: boolean

  /**
   * If true, the analyzer is called automatically. This assumes it runs without
   * blocking the main thread.
   */
  continuous?: boolean

  init?: (context: AnalyzerContext) => void | Promise<void>
  run: (
    context: AnalyzerContext,
  ) =>
    | undefined
    | null
    | AnalyzeResult
    | AnalyzeResult[]
    | Promise<undefined | null | AnalyzeResult | AnalyzeResult[]>

  /**
   * Optional method to analyze raw text without DOM context.
   * Enables agent feedback loops (test a rewrite before applying).
   * Analyzers that only work with DOM (e.g. axe-core) don't implement this.
   */
  analyzeText?: (
    text: string,
    langcode: string,
  ) => AnalyzeNode[] | Promise<AnalyzeNode[]>
}
