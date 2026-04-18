/**
 * Simple string hash (djb2 variant). Returns a base-36 encoded 32-bit integer.
 *
 * Used to create content-based identifiers for analyze nodes so that ignored
 * findings reappear when the underlying content changes.
 */
export function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}
