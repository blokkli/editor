import type { AnalyzerContext } from './analyzers/helpers/Context'
export type AnalyzeStatus = 'pass' | 'incomplete' | 'inapplicable' | 'violation'
export type AnalyzeImpact = 'minor' | 'moderate' | 'serious' | 'critical'
export type AnalyzeCategory = 'accessibility' | 'seo' | 'text' | 'content'

export type AnalyzeNodeTarget = string | HTMLElement | { uuid: string }

export type AnalyzeNode = {
  description?: string
  impact?: AnalyzeImpact
  /**
   * An array of either:
   * - string: a valid selector
   * - HTMLElement: the DOM node
   *  - object: An object containing the UUID of a block
   */
  targets: AnalyzeNodeTarget | AnalyzeNodeTarget[]
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
}

export type AnalyzeResultMapped = AnalyzeResult & {
  plugin: string
}

export type Analyzer = {
  id: string
  init?: (context: AnalyzerContext) => void | Promise<void>
  run: (
    context: AnalyzerContext,
  ) =>
    | undefined
    | null
    | AnalyzeResult
    | AnalyzeResult[]
    | Promise<undefined | null | AnalyzeResult | AnalyzeResult[]>
}
