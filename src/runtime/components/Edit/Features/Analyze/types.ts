export type AnalyzeStatus = 'pass' | 'incomplete' | 'inapplicable' | 'violation'
export type AnalyzeImpact = 'minor' | 'moderate' | 'serious' | 'critical'
export type AnalyzeCategory = 'accessibility' | 'seo' | 'text'

export type AnalyzeNode = {
  description?: string
  impact?: AnalyzeImpact
  targets: Array<string | HTMLElement>
}

export type AnalyzeResult = {
  plugin: string
  id: string
  title: string
  description: string
  link?: string
  status: AnalyzeStatus
  nodes: AnalyzeNode[]
  impact?: AnalyzeImpact
}

export type AnalyzeResultMapped = AnalyzeResult & {
  plugin: string
  category: AnalyzeCategory
}

export type AnalyzerContext = {
  langcode: string
}

export type Analyzer = {
  id: string
  category: AnalyzeCategory
  run: (context: AnalyzerContext) => AnalyzeResult[] | Promise<AnalyzeResult[]>
}
