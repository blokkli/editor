import type {
  BlockDefinitionInput,
  FragmentDefinitionInput,
} from '../runtime/types'

export type ExtractedBlockDefinitionInput = BlockDefinitionInput<any, any>
export type ExtractedFragmentDefinitionInput = FragmentDefinitionInput

export type ExtractedDefinition = {
  filePath: string
  icon?: string
  chunkName: string
  componentName: string
  proxyComponent?: string
  diffComponent?: string
  definition: ExtractedBlockDefinitionInput
  source: string
  fileSource: string
  hasBlokkliField: boolean
}

export type ExtractedFragmentDefinition = {
  filePath: string
  chunkName: string
  componentName: string
  definition: ExtractedFragmentDefinitionInput
  source: string
  fileSource: string
}

export type GetBundlePropsTypeResult = {
  typeName: string
  from: string
}

export type GetBundlePropsType = (
  name: string,
  definition: ExtractedDefinition,
) => GetBundlePropsTypeResult
