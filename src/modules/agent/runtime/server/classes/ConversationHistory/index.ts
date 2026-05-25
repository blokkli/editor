import type { GenericMessage, TranscriptMessage } from '../../../shared/types'
import type { ToolResult } from '../../../shared/toolResult'
import {
  ConversationMessage,
  UserPromptMessage,
  AssistantMessage,
  ToolRelayMessage,
} from '../ConversationMessage'

/** Looks up whether a tool's results go stale after a mutation. */
export type VolatileLookup = (toolName: string | undefined) => boolean

export type LiveProjectionOptions = {
  keepRecentTurns?: number
  tokenBudget?: number
}

/**
 * The single, append-only source of truth for a conversation.
 *
 * Canonical messages are never mutated for pruning — the views fed to the LLM,
 * persistence, and the transcript are produced by **pure, deterministic**
 * projections that compress copies. This replaces the old in-place pruning of
 * `Session.messages` (and its `unprunedMessages` snapshot side-channel).
 *
 * The mutators here represent legitimate conversation construction (append a
 * turn, merge a system note, finalise a placeholder, rollback, restore); none
 * of them is pruning.
 */
export class ConversationHistory {
  /** Recent user turns kept uncompressed (age ceiling). */
  static readonly KEEP_RECENT_TURNS = 8
  /** Token budget for full tool-result content kept live (size ceiling). */
  static readonly DEFAULT_LIVE_TOKEN_BUDGET = 6000
  /** User turns kept when projecting for persistence. */
  static readonly PERSISTENCE_KEEP_TURNS = 7

  private messages: ConversationMessage[] = []

  get length(): number {
    return this.messages.length
  }

  // --------------------------------------------------------------------------
  // Mutators (conversation construction — not pruning)
  // --------------------------------------------------------------------------

  append(message: ConversationMessage): void {
    this.messages.push(message)
  }

  /** Append a synthetic assistant `tool_use` + the matching tool-result relay. */
  appendToolExchange(
    assistant: AssistantMessage,
    relay: ToolRelayMessage,
  ): void {
    this.messages.push(assistant)
    this.messages.push(relay)
  }

  /**
   * Append user text, merging into the last message when it is already a
   * user-role message (the API rejects consecutive same-role messages).
   */
  mergeOrAppendUserText(text: string): void {
    const lastIndex = this.messages.length - 1
    const last = this.messages[lastIndex]
    if (last instanceof UserPromptMessage) {
      this.messages[lastIndex] = last.appendText(text)
    } else if (last instanceof ToolRelayMessage) {
      this.messages[lastIndex] = last.appendAux({ type: 'text', text })
    } else {
      this.messages.push(new UserPromptMessage(text))
    }
  }

  /**
   * Replace one result in the last relay (a server tool finalising a
   * placeholder it committed earlier — e.g. create_plan after approval).
   */
  replaceLastResult(toolUseId: string, result: ToolResult): void {
    const lastIndex = this.messages.length - 1
    const last = this.messages[lastIndex]
    if (last instanceof ToolRelayMessage) {
      this.messages[lastIndex] = last.replaceResult(toolUseId, result)
    }
  }

  peekLast(): ConversationMessage | undefined {
    return this.messages[this.messages.length - 1]
  }

  popLast(): void {
    this.messages.pop()
  }

  /**
   * Remove the Nth real user turn (0-based) and everything after it. Throws if
   * the index is out of range.
   */
  truncateAtUserTurn(index: number): void {
    const starts = this.userTurnStartIndices()
    const start = starts[index]
    if (start === undefined) {
      throw new Error(
        `rollbackToUserMessageIndex ${index} out of range (only ${starts.length} real user turns)`,
      )
    }
    this.messages = this.messages.slice(0, start)
  }

  /** Replace the whole history from a persisted wire snapshot (restore). */
  replaceAll(wire: GenericMessage[]): void {
    const messages = wire.map((m) => ConversationMessage.fromWire(m))
    // Resolve relay tool names from the immediately preceding assistant.
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (m instanceof ToolRelayMessage) {
        const prev = messages[i - 1]
        const names =
          prev instanceof AssistantMessage ? prev.toolUseNames() : undefined
        messages[i] = m.withResolvedNames((id) => names?.get(id))
      }
    }
    this.messages = messages
  }

  clear(): void {
    this.messages = []
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------

  countUserTurns(): number {
    return this.userTurnStartIndices().length
  }

  /** Canonical messages as wire form — the "full" (uncompressed) view. */
  toWireAll(): GenericMessage[] {
    return this.messages.map((m) => m.toWire())
  }

  /**
   * Pure, deterministic projection of the conversation for the LLM. Returns a
   * fresh `GenericMessage[]` exactly as long as the canonical history (1:1, so
   * tool_use/tool_result pairing, turn indexing, and the cache-stable prefix
   * are preserved). Never mutates canonical.
   *
   * Two ceilings combine (compress the union of both):
   *  - age: user turns older than `keepRecentTurns` are compressed;
   *  - size: tool-result rounds beyond `tokenBudget` (newest always kept full).
   * Plus eager volatile staleness: a volatile query result with a later
   * mutation collapses to `{ stale }` regardless of recency.
   */
  projectForLlm(
    isVolatile: VolatileLookup,
    opts: LiveProjectionOptions = {},
  ): GenericMessage[] {
    const keepRecentTurns =
      opts.keepRecentTurns ?? ConversationHistory.KEEP_RECENT_TURNS
    const tokenBudget =
      opts.tokenBudget ?? ConversationHistory.DEFAULT_LIVE_TOKEN_BUDGET

    const staleToolUseIds = this.computeStaleToolUseIds(isVolatile)
    const ageBoundary = this.ageCompressBoundary(keepRecentTurns)
    const budgetBoundary = this.budgetCompressBoundary(
      tokenBudget,
      staleToolUseIds,
    )
    const compressBefore = Math.max(ageBoundary, budgetBoundary)

    return this.messages.map((message, i) => {
      const old = i < compressBefore
      if (message instanceof AssistantMessage) {
        return (old ? message.withPrunedToolUseInputs() : message).toWire()
      }
      if (message instanceof ToolRelayMessage) {
        return message
          .project({ staleToolUseIds, compressBody: old, stripAux: old })
          .toWire()
      }
      // UserPromptMessage — never compressed.
      return message.toWire()
    })
  }

  /**
   * Pure projection for persistence: trim to the last `keepTurns` user turns and
   * aggressively compress (all tool results compressed, aux + old tool_use inputs
   * stripped). No volatile metadata. Output is hashed + stored by the caller.
   */
  projectForPersistence(opts: { keepTurns?: number } = {}): GenericMessage[] {
    const keepTurns =
      opts.keepTurns ?? ConversationHistory.PERSISTENCE_KEEP_TURNS

    const starts = this.userTurnStartIndices()
    const startIndex =
      starts.length > keepTurns ? (starts[starts.length - keepTurns] ?? 0) : 0
    const trimmed = this.messages.slice(startIndex)

    // Index (within `trimmed`) of the last real user turn.
    let lastTurnStart = 0
    for (let i = trimmed.length - 1; i >= 0; i--) {
      if (trimmed[i] instanceof UserPromptMessage) {
        lastTurnStart = i
        break
      }
    }

    const noStale = new Set<string>()
    return trimmed.map((message, i) => {
      const old = i < lastTurnStart
      if (message instanceof AssistantMessage) {
        return (old ? message.withPrunedToolUseInputs() : message).toWire()
      }
      if (message instanceof ToolRelayMessage) {
        return message
          .project({
            staleToolUseIds: noStale,
            compressBody: true,
            stripAux: old,
          })
          .toWire()
      }
      return message.toWire()
    })
  }

  /**
   * Transcript rows: `seen` is the projected (compressed) content the LLM sees,
   * `full` the canonical content — included only when it differs.
   */
  buildTranscriptMessages(
    isVolatile: VolatileLookup,
    opts: LiveProjectionOptions = {},
  ): TranscriptMessage[] {
    const seen = this.projectForLlm(isVolatile, opts)
    return this.messages.map((message, i) => {
      const full = message.toWire()
      const seenContent = seen[i]!.content
      const entry: TranscriptMessage = {
        type: full.role === 'assistant' ? 'agent' : 'user',
        seen: seenContent,
      }
      if (JSON.stringify(seenContent) !== JSON.stringify(full.content)) {
        entry.full = full.content
      }
      return entry
    })
  }

  // --------------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------------

  private userTurnStartIndices(): number[] {
    const indices: number[] = []
    for (let i = 0; i < this.messages.length; i++) {
      if (this.messages[i] instanceof UserPromptMessage) indices.push(i)
    }
    return indices
  }

  /** Index before which messages are compressed by the age ceiling (0 = none). */
  private ageCompressBoundary(keepRecentTurns: number): number {
    const starts = this.userTurnStartIndices()
    if (starts.length <= keepRecentTurns) return 0
    return starts[starts.length - keepRecentTurns] ?? 0
  }

  /** Index before which messages are compressed by the token-budget ceiling. */
  private budgetCompressBoundary(
    tokenBudget: number,
    staleToolUseIds: Set<string>,
  ): number {
    let used = 0
    let seenNewest = false
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i]
      if (!(message instanceof ToolRelayMessage)) continue
      const size = message.projectedTokens(staleToolUseIds)
      if (!seenNewest) {
        // The newest relay is always kept full, whatever its size.
        seenNewest = true
        used += size
        continue
      }
      used += size
      if (used > tokenBudget) return i + 1
    }
    return 0
  }

  /**
   * Tool-use ids of volatile query results that a later mutation made stale.
   * Single backward scan tracking whether a mutation has been seen yet.
   */
  private computeStaleToolUseIds(isVolatile: VolatileLookup): Set<string> {
    const stale = new Set<string>()
    let seenMutationAfter = false
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const message = this.messages[i]
      if (!(message instanceof ToolRelayMessage)) continue
      for (const entry of message.entries) {
        if (seenMutationAfter && isVolatile(entry.toolName)) {
          stale.add(entry.toolUseId)
        }
      }
      if (message.entries.some((e) => e.result.isMutationSuccess())) {
        seenMutationAfter = true
      }
    }
    return stale
  }
}
