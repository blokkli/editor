import type { Analyzer } from './analyzers/types'

declare module '#blokkli/editor/adapter' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BlokkliAdapter<T> {
    getAnalyzers?: () =>
      | Analyzer
      | Analyzer[]
      | Promise<Analyzer>
      | Promise<Analyzer[]>
  }
}
