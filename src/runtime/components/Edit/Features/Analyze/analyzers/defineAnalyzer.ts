import type { Analyzer } from './types'

type AnalyzerInit<O extends object> = (options?: O) => Analyzer

export function defineAnalyzer<
  O extends object,
  // Whether there is at least one required option.
  HasOptions = object extends O ? true : false,
>(
  init: AnalyzerInit<O>,
): HasOptions extends true
  ? // No option properties are required.
    (options?: O) => Analyzer
  : // Some option properties are required, thus an object argument is required.
    (options: O) => Analyzer {
  return function (options?: O) {
    return init(options as any)
  }
}
