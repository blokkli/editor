export const HORIZONTAL_ELLIPSIS = '…'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape text for use in markup: in an element's content or in a quoted
 * attribute value.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]!)
}

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
  return (
    value.slice(0, maxLength - HORIZONTAL_ELLIPSIS.length) + HORIZONTAL_ELLIPSIS
  )
}
