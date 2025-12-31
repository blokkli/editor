import type { Analyzer } from './analyzers/types'

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    getAnalyzers?: () =>
      | Analyzer
      | Analyzer[]
      | Promise<Analyzer>
      | Promise<Analyzer[]>
  }
}
