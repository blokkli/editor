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

  interface BlokkliAdapter<T> {
    /**
     * Set the ignored analyze identifiers for the current entity.
     * Each identifier is a composite key: `${resultId}:${nodeIdentifier}`.
     *
     * This is a mutation so it supports undo/redo.
     */
    setIgnoredAnalyzeIdentifiers?: (
      identifiers: string[],
    ) => Promise<MutationResponseLike<T>>
  }
}
