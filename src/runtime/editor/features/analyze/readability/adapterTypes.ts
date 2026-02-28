import type { ReadabilityAnalyzer } from './types'

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface AdapterExtensionMethods<T> {
    /**
     * Return a custom readability analyzer to override the built-in default.
     */
    getReadabilityAnalyzer?: () =>
      | ReadabilityAnalyzer
      | Promise<ReadabilityAnalyzer>
  }
}
