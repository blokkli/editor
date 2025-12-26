import type { DebugProvider } from './debug'

export type ElementProvider = {
  /**
   * Query all matching elements with debug logging.
   *
   * Wrapper around `querySelectorAll` that:
   * - Logs the query and reason to debug console
   * - Filters out non-HTMLElement results
   * - Optionally maps/transforms results
   * - Filters out null/undefined mapped results
   *
   * @param target - Element or document to query within
   * @param query - CSS selector string
   * @param reason - Human-readable reason for the query (for debugging)
   * @param map - Optional function to transform each matched element
   * @returns Array of matched (and optionally transformed) elements
   *
   * @example
   * ```ts
   * // Get all buttons
   * const buttons = element.queryAll(document, 'button', 'Get all buttons')
   *
   * // Get all buttons with data attributes
   * const buttonData = element.queryAll(
   *   document,
   *   'button[data-action]',
   *   'Get action buttons',
   *   (el) => el.dataset.action
   * )
   * ```
   */
  queryAll: <T = HTMLElement>(
    target: HTMLElement | Document,
    query: string,
    reason: string,
    map?: (v: HTMLElement) => T | null | undefined,
  ) => T[]

  /**
   * Query the first matching element with debug logging.
   *
   * Wrapper around `querySelector` that:
   * - Logs the query and reason to debug console
   * - Returns null if no match or match is not HTMLElement
   * - Optionally maps/transforms the result
   *
   * @param target - Element or document to query within
   * @param query - CSS selector string
   * @param reason - Human-readable reason for the query (for debugging)
   * @param map - Optional function to transform the matched element
   * @returns The first matched (and optionally transformed) element, or null
   *
   * @example
   * ```ts
   * // Get first button
   * const button = element.query(document, 'button', 'Get first button')
   *
   * // Get button action
   * const action = element.query(
   *   document,
   *   'button[data-action]',
   *   'Get action button',
   *   (el) => el.dataset.action
   * )
   * ```
   */
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
