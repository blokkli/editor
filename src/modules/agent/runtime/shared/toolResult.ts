/**
 * Typed value object for a single tool result.
 *
 * A tool result crosses the wire as an opaque JSON **string** (both LLM provider
 * APIs require `tool_result.content` to be a string). Historically the pruning
 * code re-`JSON.parse`d that string and inspected untyped fields
 * (`parsed._summary`, `.label`, `.success`, ...) to decide how to compress it.
 * `ToolResult` does that classification ONCE, into a typed {@link ToolResultEnvelope},
 * and exposes pure, deterministic transforms used by the conversation projection.
 *
 * It keeps the original wire string verbatim (`raw`) so an un-compressed result
 * re-serialises byte-identically (important for Anthropic prompt-cache prefix
 * matching); compressed/stale forms are tiny fixed-shape objects.
 *
 * Pure utility shared by the client-facing protocol and the server projection,
 * mirroring the `shared/toolParams.ts` precedent. No client-tool Zod schemas are
 * imported here — classification is field-driven, matching the fact that results
 * are never validated against their schema server-side.
 */

/**
 * Typed classification of a tool result, derived once from its wire content.
 * The `summaryText` carried on several variants is the explicit summary the
 * client/tool provided (`_summary ?? label ?? summary`), which takes precedence
 * when compressing — preserving the historical compression precedence.
 */
export type ToolResultEnvelope =
  | { kind: 'opaque'; text: string }
  | { kind: 'stale'; summary: string }
  | { kind: 'error'; message: string; summaryText?: string }
  | { kind: 'mutationSuccess'; summaryText?: string }
  | { kind: 'mutationRejected'; summaryText?: string }
  | { kind: 'selection'; selected: unknown; summaryText?: string }
  | { kind: 'summary'; summary: string }

const STALE_FALLBACK = 'page state has changed since this query'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A non-empty string, else undefined. */
function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export class ToolResult {
  private constructor(
    /** The original (or compressed) wire string, emitted verbatim by `toWire`. */
    private readonly raw: string,
    private readonly envelope: ToolResultEnvelope,
    private readonly isError: boolean,
    /** Summary used when this result is evicted as stale (`_summary ?? summary`). */
    private readonly staleSummary: string,
  ) {}

  /**
   * Classify a wire string (the form stored in a `tool_result` block) once.
   * Mirrors the historical `compressToolResult` precedence.
   */
  static fromWire(content: string, isError?: boolean): ToolResult {
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return new ToolResult(
        content,
        { kind: 'opaque', text: content },
        !!isError,
        STALE_FALLBACK,
      )
    }

    if (!isRecord(parsed)) {
      // Valid JSON but not an object (array/number/etc.) — treat as opaque.
      return new ToolResult(
        content,
        { kind: 'opaque', text: content },
        !!isError,
        STALE_FALLBACK,
      )
    }

    const staleSummary =
      asText(parsed._summary) ?? asText(parsed.summary) ?? STALE_FALLBACK

    // Explicit summary text the client/tool supplied, in precedence order.
    const summaryText =
      asText(parsed._summary) ??
      asText(parsed.label) ??
      (typeof parsed.summary === 'string' ? parsed.summary : undefined)

    let envelope: ToolResultEnvelope
    let errorFlag = !!isError

    if (parsed.stale === true) {
      envelope = {
        kind: 'stale',
        summary: asText(parsed.summary) ?? staleSummary,
      }
    } else if (asText(parsed.error)) {
      envelope = { kind: 'error', message: parsed.error as string, summaryText }
      errorFlag = true
    } else if (parsed.success === true) {
      envelope = { kind: 'mutationSuccess', summaryText }
    } else if (parsed.success === false) {
      envelope = { kind: 'mutationRejected', summaryText }
    } else if (parsed.selected !== undefined) {
      envelope = { kind: 'selection', selected: parsed.selected, summaryText }
    } else if (summaryText !== undefined) {
      envelope = { kind: 'summary', summary: summaryText }
    } else {
      // Valid JSON object with no recognised field — generic fallback.
      envelope = { kind: 'summary', summary: 'completed' }
    }

    return new ToolResult(content, envelope, errorFlag, staleSummary)
  }

  /**
   * Build from a live client result object (server tool-dispatch path).
   * Applies the `agentMessage → label` rewrite and serialises with the same
   * bytes the previous code produced, then classifies.
   */
  static fromClientResult(
    result: unknown,
    opts?: { isError?: boolean },
  ): ToolResult {
    let value = result
    if (isRecord(value) && 'agentMessage' in value) {
      const { agentMessage, ...rest } = value
      value = { ...rest, label: agentMessage }
    }
    const content = JSON.stringify(value) ?? 'null'
    return ToolResult.fromWire(content, opts?.isError)
  }

  /** An explicit error result (malformed input, loop guard, validation, ...). */
  static error(message: string): ToolResult {
    return ToolResult.fromWire(JSON.stringify({ error: message }), true)
  }

  /** The wire string for this result — verbatim original, or the compressed form. */
  toWire(): string {
    return this.raw
  }

  isErrorResult(): boolean {
    return this.isError
  }

  /** True for an applied mutation (`{ success: true }`), independent of summary. */
  isMutationSuccess(): boolean {
    return this.envelope.kind === 'mutationSuccess'
  }

  /** Best human-readable summary of this result. */
  summary(): string {
    const env = this.envelope
    switch (env.kind) {
      case 'opaque':
        return env.text
      case 'stale':
      case 'summary':
        return env.summary
      case 'error':
        return env.summaryText ?? env.message
      default:
        return env.summaryText ?? 'completed'
    }
  }

  /** Estimated token cost of the full wire content (~4 chars per token). */
  estimatedTokens(): number {
    return this.raw.length / 4
  }

  /**
   * Compressed form: collapse to the minimal payload. Pure (returns a new
   * `ToolResult`) and idempotent. Replicates the historical `compressToolResult`
   * precedence: an explicit `summaryText` wins; otherwise the kind-specific
   * minimal shape (`{error}` / `{success}` / `{selected}`) is kept.
   */
  compressed(): ToolResult {
    const env = this.envelope
    switch (env.kind) {
      case 'opaque': {
        const text =
          env.text.length > 100 ? env.text.slice(0, 100) + '...' : env.text
        return new ToolResult(
          text,
          { kind: 'opaque', text },
          this.isError,
          this.staleSummary,
        )
      }
      case 'stale':
        return this // already minimal + sticky
      case 'summary':
        return ToolResult.fromWire(JSON.stringify({ summary: env.summary }))
      case 'error':
        return env.summaryText !== undefined
          ? ToolResult.fromWire(JSON.stringify({ summary: env.summaryText }))
          : ToolResult.fromWire(JSON.stringify({ error: env.message }), true)
      case 'mutationSuccess':
        return env.summaryText !== undefined
          ? ToolResult.fromWire(JSON.stringify({ summary: env.summaryText }))
          : ToolResult.fromWire(JSON.stringify({ success: true }))
      case 'mutationRejected':
        return env.summaryText !== undefined
          ? ToolResult.fromWire(JSON.stringify({ summary: env.summaryText }))
          : ToolResult.fromWire(JSON.stringify({ success: false }))
      case 'selection':
        return env.summaryText !== undefined
          ? ToolResult.fromWire(JSON.stringify({ summary: env.summaryText }))
          : ToolResult.fromWire(JSON.stringify({ selected: env.selected }))
    }
  }

  /**
   * Stale form: a volatile query whose data is outdated because a mutation
   * happened after it. Pure and idempotent.
   *
   * Error results are preserved verbatim — a failed call isn't "stale data",
   * it's a failure the LLM may still need to act on (e.g. fix its input and
   * retry). Collapsing it to a generic stale summary hides the cause.
   */
  stale(): ToolResult {
    if (this.envelope.kind === 'stale') return this
    if (this.envelope.kind === 'error') return this
    return ToolResult.fromWire(
      JSON.stringify({ stale: true, summary: this.staleSummary }),
    )
  }
}
