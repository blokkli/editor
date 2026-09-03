import type { AnalyzerContext } from './helpers/Context'
import type { TextProvider } from '#blokkli/editor/providers/texts'

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
   * Optional numeric score for this node (e.g. readability index).
   */
  score?: number
  /**
   * Optional UUID of the block this node belongs to.
   * Used to determine block hierarchy for highlight rendering.
   */
  uuid?: string
  /**
   * Content-based identifier for this finding. When set, the user can ignore
   * this node. Combined with the parent result's `id` to form the stored key:
   * `${result.id}:${node.identifier}`.
   *
   * Not a unique ID — it's a hash of the analyzed content. If the content
   * changes, the identifier changes and the finding reappears.
   */
  identifier?: string
  /**
   * Optional URL that helps resolving this finding, e.g. the edit form of
   * the referenced media entity. Rendered as an external link next to the
   * node.
   */
  link?: string
  /**
   * Label for the score metric (e.g., "FRE", "LIX", "WSTF").
   * Shown as a badge in the results UI when both score and scoreLabel are set.
   */
  scoreLabel?: string
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
  ignored: boolean
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

export type AnalyzerType = 'generic' | 'readability'

export type Analyzer = {
  id: string

  /**
   * The type of analyzer. Defaults to 'generic'.
   *
   * - 'readability': Text readability analysis (LIX, Flesch, etc.)
   * - 'generic': Any other type of analysis (accessibility, SEO, custom checks)
   */
  type?: AnalyzerType

  label?: string | ((langcode: string, $t: TextProvider) => string)

  description?: string | ((langcode: string, $t: TextProvider) => string)

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
