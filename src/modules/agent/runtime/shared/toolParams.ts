import { z } from 'zod'

/**
 * A boolean parameter that also accepts the strings `"true"` / `"false"` (any
 * case), coercing them to real booleans. LLMs frequently send a stringified
 * boolean (e.g. `requireApproval: "false"`) and would otherwise fail validation
 * on the first call. The generated JSON Schema still advertises a boolean, so
 * the model is guided toward the real type while the string form is accepted as
 * a fallback. Mirrors `stringArrayParam` / `z.coerce.number()` used elsewhere.
 *
 * Type-aware on purpose: it only fires where a boolean is expected, so a string
 * param that happens to equal `"false"` is never clobbered. Genuinely invalid
 * values (e.g. `"maybe"`) still fail validation rather than being swallowed.
 *
 * Lives in `shared/` so both client tools and server-only tools build the same
 * coercion into their respective bundles from one source.
 *
 * Return type is explicit so mkdist's isolated-declaration emit preserves it
 * when this helper appears nested inside another schema. Chaining `.optional()`
 * or `.default()` on the result would degrade to `any` in the published `.d.ts`
 * — use {@link optionalBooleanParam} / {@link booleanParamWithDefault} instead.
 */
export function booleanParam(
  description: string,
): z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodBoolean> {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase()
      if (lower === 'true') return true
      if (lower === 'false') return false
    }
    return value
  }, z.boolean().describe(description))
}

/**
 * Optional variant of {@link booleanParam}. Use instead of
 * `booleanParam(...).optional()` so isolated-declaration emit can preserve the
 * type — chained Zod method calls aren't resolvable by mkdist's per-file
 * declaration emit and collapse to `any` in the published `.d.ts`.
 */
export function optionalBooleanParam(
  description: string,
): z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodBoolean>> {
  return booleanParam(description).optional()
}

/**
 * Optional boolean with a default. Use instead of
 * `booleanParam(...).optional().default(value)` so isolated-declaration emit
 * can preserve the type. The default value applies when the param is omitted
 * or `undefined` at parse time.
 */
export function booleanParamWithDefault(
  description: string,
  defaultValue: boolean,
): z.ZodDefault<
  z.ZodOptional<z.ZodPipe<z.ZodTransform<unknown, unknown>, z.ZodBoolean>>
> {
  return booleanParam(description).optional().default(defaultValue)
}

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
