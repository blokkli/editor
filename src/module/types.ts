import type {
  BlockDefinitionInput,
  FragmentDefinitionInput,
} from '../runtime/types'

export type ExtractedBlockDefinitionInput = BlockDefinitionInput
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

export type BuildRelativeImports = {
  TYPES: string
  CONSTANTS: string
  ADAPTER: string
  TYPES_THEME: string
  TYPES_GENERATED_MODULE_TYPED: string
  TYPES_BLOKK_OPTIONS: string
}

export type ModuleContext = {
  /**
   * The absolute path to the blokkli build directory.
   */
  blokkliBuildDir: string

  /**
   * The srcDir of the Nuxt app.
   */
  srcDir: string
}
