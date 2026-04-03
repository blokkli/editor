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
     * Ignore a single analyze finding.
     * The identifier is a composite key: `${resultId}:${nodeIdentifier}`.
     */
    ignoreAnalyzeIdentifier?: (
      identifier: string,
    ) => Promise<MutationResponseLike<T>>

    /**
     * Restore a previously ignored analyze finding.
     * The identifier is a composite key: `${resultId}:${nodeIdentifier}`.
     */
    unignoreAnalyzeIdentifier?: (
      identifier: string,
    ) => Promise<MutationResponseLike<T>>
  }
}
