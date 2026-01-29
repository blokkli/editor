import type { Analyzer } from './analyzers/types'

declare module '#blokkli/editor/adapter' {
  /**
   * Extensible analyze methods - available on both base adapter and extensions.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface AdapterExtensionMethods<T> {
    getAnalyzers?: () =>
      | Analyzer
      | Analyzer[]
      | Promise<Analyzer>
      | Promise<Analyzer[]>
  }
}
