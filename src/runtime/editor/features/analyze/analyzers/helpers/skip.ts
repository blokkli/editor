/**
 * Elements with this class (and everything inside them) are excluded from
 * analysis.
 */
export const SKIP_ANALYZE_CLASS = 'bk-skip-analyze'

/**
 * Whether the element is, or is inside, an element that opted out of
 * analysis.
 */
export function isSkipped(element: Element): boolean {
  return !!element.closest('.' + SKIP_ANALYZE_CLASS)
}
