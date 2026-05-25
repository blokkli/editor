import type {
  GenericMessage,
  GenericContentBlock,
  GenericTextBlock,
  GenericSkillBlock,
  GenericToolResultBlock,
} from '../../../shared/types'
import { ToolResult } from '../../../shared/toolResult'

/**
 * Typed, OOP representation of one conversation message.
 *
 * `Session` keeps an immutable list of these as the single source of truth.
 * They are an internal server representation: every external consumer (the LLM
 * providers, persistence, the transcript, the state hash) keeps consuming the
 * plain `GenericMessage` wire shape produced by {@link toWire}. The pruning that
 * used to mutate the message array is now a pure projection (see
 * `ConversationHistory`) that compresses *copies* produced by these classes.
 *
 * Message kind is explicit (`kind`) rather than inferred from content shape,
 * replacing the old `isToolResultOnly` / `countUserTurns` heuristics.
 */
export abstract class ConversationMessage {
  abstract readonly kind: 'userPrompt' | 'assistant' | 'toolRelay'
  abstract toWire(): GenericMessage

  /**
   * Rehydrate a message from its wire form (persistence restore). Tool names on
   * relay results are NOT resolved here (a single message lacks the preceding
   * assistant); `ConversationHistory.replaceAll` resolves them.
   */
  static fromWire(msg: GenericMessage): ConversationMessage {
    if (msg.role === 'assistant') {
      return new AssistantMessage(msg.content)
    }
    if (
      Array.isArray(msg.content) &&
      msg.content.some((b) => b.type === 'tool_result')
    ) {
      return ToolRelayMessage.fromWire(msg)
    }
    return new UserPromptMessage(msg.content)
  }
}

/**
 * A genuine user turn — the prompt text, optionally preceded by auto-loaded
 * skill blocks. Never compressed (a prompt's text is content, not a tool result),
 * so prompt text can never be stripped and the content array can never be emptied.
 */
export class UserPromptMessage extends ConversationMessage {
  readonly kind = 'userPrompt' as const

  constructor(private readonly content: string | GenericContentBlock[]) {
    super()
  }

  toWire(): GenericMessage {
    return { role: 'user', content: this.content }
  }

  /** Pure: a copy with `text` merged in (string concat or appended text block). */
  appendText(text: string): UserPromptMessage {
    if (typeof this.content === 'string') {
      return new UserPromptMessage(this.content + '\n' + text)
    }
    return new UserPromptMessage([...this.content, { type: 'text', text }])
  }
}

/**
 * An assistant turn: an ordered list of text / reasoning / tool_use blocks
 * (or, rarely, a plain string when rehydrated). The content union is preserved
 * verbatim so projection re-serialises byte-identically.
 */
export class AssistantMessage extends ConversationMessage {
  readonly kind = 'assistant' as const

  constructor(private readonly content: string | GenericContentBlock[]) {
    super()
  }

  toWire(): GenericMessage {
    return { role: 'assistant', content: this.content }
  }

  /** Map of `tool_use` id → tool name, for resolving relay tool names. */
  toolUseNames(): Map<string, string> {
    const map = new Map<string, string>()
    if (Array.isArray(this.content)) {
      for (const block of this.content) {
        if (block.type === 'tool_use') map.set(block.id, block.name)
      }
    }
    return map
  }

  /**
   * Pure: a copy with every `tool_use` input collapsed to `{ _pruned: true }`.
   * `text` / `reasoning` / `skill` blocks are left untouched.
   */
  withPrunedToolUseInputs(): AssistantMessage {
    if (!Array.isArray(this.content)) return this
    const blocks = this.content.map((block) =>
      block.type === 'tool_use'
        ? { ...block, input: { _pruned: true } }
        : block,
    )
    return new AssistantMessage(blocks)
  }
}

/** One tool result inside a relay, with the tool name that produced it. */
export type ToolRelayEntry = {
  toolUseId: string
  /** Resolved from the preceding assistant's `tool_use`; drives volatile checks. */
  toolName: string | undefined
  result: ToolResult
}

/**
 * A tool-result relay: `{ role: 'user', content: [tool_result, ...auxBlocks] }`.
 * The protocol encodes tool results as user-role messages; this class makes that
 * explicit. Carries the resolved tool name per result so the projection needs no
 * back-scan.
 */
export class ToolRelayMessage extends ConversationMessage {
  readonly kind = 'toolRelay' as const

  constructor(
    private readonly results: ToolRelayEntry[],
    private readonly auxBlocks: (GenericTextBlock | GenericSkillBlock)[] = [],
  ) {
    super()
  }

  static fromWire(msg: GenericMessage): ToolRelayMessage {
    const content = Array.isArray(msg.content) ? msg.content : []
    const results: ToolRelayEntry[] = []
    const auxBlocks: (GenericTextBlock | GenericSkillBlock)[] = []
    for (const block of content) {
      if (block.type === 'tool_result') {
        results.push({
          toolUseId: block.tool_use_id,
          toolName: undefined,
          result: ToolResult.fromWire(block.content, block.is_error),
        })
      } else if (block.type === 'text' || block.type === 'skill') {
        auxBlocks.push(block)
      }
    }
    return new ToolRelayMessage(results, auxBlocks)
  }

  get entries(): readonly ToolRelayEntry[] {
    return this.results
  }

  toWire(): GenericMessage {
    const content: GenericContentBlock[] = this.results.map((entry) => {
      const block: GenericToolResultBlock = {
        type: 'tool_result',
        tool_use_id: entry.toolUseId,
        content: entry.result.toWire(),
      }
      if (entry.result.isErrorResult()) block.is_error = true
      return block
    })
    return { role: 'user', content: [...content, ...this.auxBlocks] }
  }

  /** Estimated token cost of the full (uncompressed) tool-result content. */
  estimatedTokens(): number {
    return this.results.reduce((sum, e) => sum + e.result.estimatedTokens(), 0)
  }

  /**
   * Estimated tokens once the given results are marked stale — used by the
   * budget walk so a large stale result doesn't consume budget (the
   * volatile/staleness decision logically precedes the size ceiling).
   */
  projectedTokens(staleToolUseIds: Set<string>): number {
    return this.results.reduce((sum, e) => {
      const r = staleToolUseIds.has(e.toolUseId) ? e.result.stale() : e.result
      return sum + r.estimatedTokens()
    }, 0)
  }

  /** Pure: a copy with an auxiliary text/skill block appended. */
  appendAux(block: GenericTextBlock | GenericSkillBlock): ToolRelayMessage {
    return new ToolRelayMessage(this.results, [...this.auxBlocks, block])
  }

  /**
   * Pure projection: per-result, stale results (by tool_use id) collapse to
   * `{ stale }`, otherwise compress the body when `compressBody`. Aux blocks are
   * dropped when `stripAux`.
   */
  project(opts: {
    staleToolUseIds: Set<string>
    compressBody: boolean
    stripAux: boolean
  }): ToolRelayMessage {
    const results = this.results.map((entry) => {
      let result = entry.result
      if (opts.staleToolUseIds.has(entry.toolUseId)) {
        result = result.stale()
      } else if (opts.compressBody) {
        result = result.compressed()
      }
      return result === entry.result ? entry : { ...entry, result }
    })
    return new ToolRelayMessage(results, opts.stripAux ? [] : this.auxBlocks)
  }

  /** Pure: a copy with one result replaced (create_plan post-approval swap). */
  replaceResult(toolUseId: string, result: ToolResult): ToolRelayMessage {
    const results = this.results.map((entry) =>
      entry.toolUseId === toolUseId ? { ...entry, result } : entry,
    )
    return new ToolRelayMessage(results, this.auxBlocks)
  }

  /** Pure: a copy with tool names resolved via the given lookup (rehydration). */
  withResolvedNames(
    resolve: (toolUseId: string) => string | undefined,
  ): ToolRelayMessage {
    const results = this.results.map((entry) => ({
      ...entry,
      toolName: entry.toolName ?? resolve(entry.toolUseId),
    }))
    return new ToolRelayMessage(results, this.auxBlocks)
  }
}
