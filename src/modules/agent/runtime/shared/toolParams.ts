/**
 * Coerce double-serialized array/object params back to their real values.
 *
 * LLMs sometimes send e.g. `"[\"x\"]"` (a string) instead of `["x"]` (an array).
 * This walks the params and attempts `JSON.parse` on any string that looks like
 * a JSON array or object.
 *
 * Pure utility shared by the client (tool execution) and the server (tool
 * validation/dispatch), so both sides coerce identically.
 */
export function coerceStringifiedParams(
  params: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (typeof value === 'string' && (value[0] === '[' || value[0] === '{')) {
      try {
        result[key] = JSON.parse(value)
      } catch {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}
