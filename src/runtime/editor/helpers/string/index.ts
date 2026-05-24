export const HORIZONTAL_ELLIPSIS = '…'

/**
 * Truncate a string to a maximum length, appending an ellipsis when truncated.
 *
 * The ellipsis is included in the resulting length, so the output never exceeds
 * `maxLength` characters.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return value.slice(0, maxLength - HORIZONTAL_ELLIPSIS.length) + HORIZONTAL_ELLIPSIS
}
