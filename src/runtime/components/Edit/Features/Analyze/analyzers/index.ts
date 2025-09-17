import type { Analyzer } from '../types'

export function defineAnalyzer(factory: () => Analyzer): Analyzer {
  return factory()
}
