import type { DebugProvider } from './debug'

export type ElementProvider = {
  queryAll: <T = HTMLElement>(
    target: HTMLElement | Document,
    query: string,
    reason: string,
    map?: (v: HTMLElement) => T | null | undefined,
  ) => T[]

  query: <T = HTMLElement>(
    target: HTMLElement | Document,
    query: string,
    reason: string,
    map?: (v: HTMLElement) => T | null | undefined,
  ) => T | null
}

export default function (debug: DebugProvider): ElementProvider {
  const logger = debug.createLogger('ElementProvider')

  function queryAll<T = HTMLElement>(
    target: HTMLElement | Document,
    query: string,
    reason: string,
    map?: (v: HTMLElement) => T | null | undefined,
  ): T[] {
    const results: T[] = []
    logger.log(`querySelectorAll - "${query}" - ${reason}`)

    for (const element of target.querySelectorAll(query)) {
      if (element instanceof HTMLElement) {
        if (map) {
          const result = map(element)
          if (result) {
            results.push(result)
          }
        } else {
          // @ts-expect-error T could be any type, but we fallback to HTMLElement.
          results.push(element)
        }
      }
    }

    return results
  }

  function query<T = HTMLElement>(
    target: HTMLElement | Document,
    query: string,
    reason: string,
    map?: (v: HTMLElement) => T | undefined,
  ): T | null {
    logger.log(`querySelector - "${query}" - ${reason}`)

    const match = target.querySelector(query)

    if (!(match instanceof HTMLElement)) {
      return null
    }

    if (map) {
      return map(match) ?? null
    }

    // @ts-expect-error T could be any type, but we fallback to HTMLElement.
    return match
  }

  return {
    query,
    queryAll,
  }
}
