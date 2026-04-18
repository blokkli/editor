import { defineBlokkliAdapterExtension } from '#blokkli/editor/adapter'
import { createBuiltinReadabilityAnalyzer } from './analyzers/builtin'

export default defineBlokkliAdapterExtension(() => ({
  getReadabilityAnalyzer: () => createBuiltinReadabilityAnalyzer(),
}))
