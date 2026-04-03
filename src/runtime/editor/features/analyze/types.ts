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
     * Ignore one or more analyze findings.
     * Each identifier is a composite key: `${resultId}:${nodeIdentifier}`.
     */
    ignoreAnalyzeIdentifiers?: (
      identifiers: string[],
    ) => Promise<MutationResponseLike<T>>

    /**
     * Restore one or more previously ignored analyze findings.
     * Each identifier is a composite key: `${resultId}:${nodeIdentifier}`.
     */
    unignoreAnalyzeIdentifiers?: (
      identifiers: string[],
    ) => Promise<MutationResponseLike<T>>
  }
}
