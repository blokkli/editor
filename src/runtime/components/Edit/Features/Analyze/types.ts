import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import type { FieldListItem, MutatedField } from '#blokkli/types'

export type AnalyzeStatus = 'pass' | 'incomplete' | 'inapplicable' | 'violation'
export type AnalyzeImpact = 'minor' | 'moderate' | 'serious' | 'critical'
export type AnalyzeCategory = 'accessibility' | 'seo' | 'text' | 'content'

export type AnalyzeNode = {
  description?: string
  impact?: AnalyzeImpact
  targets: Array<string | HTMLElement | { uuid: string }>
}

export type AnalyzeResult = {
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
  interfaceLangcode: string
  providerRootElement: HTMLElement
  mutatedFields: Readonly<MutatedField[]>
  getFieldListItem: (uuid: string) => FieldListItemTyped | undefined
}

type AnalyzerRunResultWithCategory = AnalyzeResult & {
  category: AnalyzeCategory
}
type AnalyzerRunResultMaybeCategory =
  | AnalyzeResult
  | AnalyzerRunResultWithCategory

export type Analyzer =
  | {
      id: string
      init?: (context: AnalyzerContext) => void | Promise<void>
      run: (
        context: AnalyzerContext,
      ) =>
        | AnalyzerRunResultWithCategory[]
        | Promise<AnalyzerRunResultWithCategory[]>
    }
  | {
      id: string
      category: AnalyzeCategory
      init?: (context: AnalyzerContext) => void | Promise<void>
      run: (
        context: AnalyzerContext,
      ) =>
        | AnalyzerRunResultMaybeCategory[]
        | Promise<AnalyzerRunResultMaybeCategory[]>
    }
