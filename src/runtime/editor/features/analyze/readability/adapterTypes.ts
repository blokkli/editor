import type { ReadabilityAnalyzer } from './types'

declare module '#blokkli/editor/adapter' {
  interface AdapterExtensionMethods<T> {
    /**
     * Return a custom readability analyzer to override the built-in default.
     */
    getReadabilityAnalyzer?: () =>
      | ReadabilityAnalyzer
      | Promise<ReadabilityAnalyzer>
  }
}
