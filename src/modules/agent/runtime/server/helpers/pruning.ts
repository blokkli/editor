import type { GenericMessage, GenericContentBlock } from '../../shared/types'
import {
  isToolResultOnly,
  findToolNameForResult,
  countUserTurns,
} from './messages'

/**
 * Conversation pruning: shrink the message history sent to the LLM to bound
 * token cost. Three entry points share the same compression primitives:
 * - `pruneMessages` — age ceiling (keyed on user turns), run once per turn.
 * - `pruneLiveContext` — size ceiling (token budget), run between tool rounds.
 * - `pruneForPersistence` — pure deep-clone variant for storage.
 *
 * See PRUNING_REFACTOR.md for why these currently mutate in place.
 */

/** Number of recent turns to keep uncompressed when pruning messages */
export const KEEP_RECENT_TURNS = 8

/** Number of recent turns to keep when pruning for persistence */
const PERSISTENCE_KEEP_TURNS = 7

/**
 * Estimated token budget for full tool-result content kept in the live (in-loop)
 * context. Tunable. The newest tool-result round is always kept full regardless,
 * so this caps the *older* results, not the freshly-read one.
 */
export const DEFAULT_LIVE_TOKEN_BUDGET = 6000

/**
 * Metadata about a tool used during message pruning.
 */
export type ToolPruningMetadata = {
  volatile?: boolean
}

/**
 * Compress a tool result to reduce token usage.
 * Extracts just the essential information from the result.
 */
export function compressToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content)

    // Client-computed summary takes highest priority
    if (parsed._summary) {
      return JSON.stringify({ summary: parsed._summary })
    }

    // Query tools have a label field - use it as summary
    if (parsed.label) {
      return JSON.stringify({ summary: parsed.label })
    }

    // Already-compressed result (from a previous pruning pass). Pruning runs
    // in place every turn, so an old result is re-compressed repeatedly —
    // preserve its summary instead of degrading it to the generic fallback.
    if (parsed.summary !== undefined) {
      return JSON.stringify({ summary: parsed.summary })
    }

    // Error results - keep the error message
    if (parsed.error) {
      return JSON.stringify({ error: parsed.error })
    }

    // Mutation success - keep minimal info
    if (parsed.success !== undefined) {
      return JSON.stringify({ success: parsed.success })
    }

    // Interactive tools (ask_question, select_media) - keep selected value
    if (parsed.selected !== undefined) {
      return JSON.stringify({ selected: parsed.selected })
    }

    // Fallback - just note it was processed
    return JSON.stringify({ summary: 'completed' })
  } catch {
    // Not JSON or parse error - truncate if too long
    return content.length > 100 ? content.slice(0, 100) + '...' : content
  }
}

/**
 * Compress a volatile tool result — the page state has changed since this
 * query ran, so the data is stale. Falls back to an existing `summary` so that
 * re-running over an already-stale result keeps the first summary (idempotent).
 */
export function compressVolatileToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content)
    const summary =
      parsed._summary ||
      parsed.summary ||
      'page state has changed since this query'
    return JSON.stringify({ stale: true, summary })
  } catch {
    return JSON.stringify({
      stale: true,
      summary: 'page state has changed since this query',
    })
  }
}

/**
 * Check whether any mutation tool_result exists between two message indices.
 * Used to determine if a volatile query result has become stale.
 */
function hasMutationBetween(
  messages: GenericMessage[],
  afterIndex: number,
  beforeIndex: number,
  toolMetadata: Map<string, ToolPruningMetadata>,
): boolean {
  for (let i = afterIndex + 1; i < beforeIndex; i++) {
    const msg = messages[i]
    if (!msg) continue
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (block.type !== 'tool_result') continue
      const toolName = findToolNameForResult(messages, i, block.tool_use_id)
      if (!toolName) continue
      // A tool is a mutation if it's NOT in the metadata as volatile, and
      // it's NOT a server tool. Check if it's a mutation by seeing if the
      // result contains { success: ... } (mutation result pattern).
      const meta = toolMetadata.get(toolName)
      if (meta?.volatile) continue // queries, not mutations
      try {
        const parsed = JSON.parse(block.content)
        if (parsed.success !== undefined) return true
      } catch {
        // not JSON, skip
      }
    }
  }
  return false
}

/**
 * Compress one user message's content in place: shrink every `tool_result` block
 * to its essential summary, and (when `stripAux`) drop auxiliary `text`/`skill`
 * blocks that accompany a tool result. A genuine user prompt has no tool_result,
 * so its text is never stripped — emptying the array would make the API reject it.
 *
 * Shared by `pruneMessages` and `pruneForPersistence`:
 * - `volatileCheck` enables the stale-query path (used only by `pruneMessages`,
 *   which has the tool metadata + later mutations needed to detect staleness).
 * - `stripAux` lets the caller gate the text/skill stripping by message age.
 */
export function compressUserMessageContent(
  content: GenericContentBlock[],
  messages: GenericMessage[],
  i: number,
  metadata: Map<string, ToolPruningMetadata>,
  opts: { volatileCheck: boolean; stripAux: boolean },
): void {
  const hasToolResult = content.some((b) => b.type === 'tool_result')
  for (let j = content.length - 1; j >= 0; j--) {
    const block = content[j]
    if (!block) continue
    if (block.type === 'tool_result') {
      let stale = false
      if (opts.volatileCheck) {
        const toolName = findToolNameForResult(messages, i, block.tool_use_id)
        const meta = toolName ? metadata.get(toolName) : undefined
        stale =
          !!meta?.volatile &&
          hasMutationBetween(messages, i, messages.length, metadata)
      }
      block.content = stale
        ? compressVolatileToolResult(block.content)
        : compressToolResult(block.content)
    } else if (
      opts.stripAux &&
      hasToolResult &&
      (block.type === 'text' || block.type === 'skill')
    ) {
      content.splice(j, 1)
    }
  }
}

/**
 * Prune old messages to reduce context size.
 * Keeps recent messages intact, compresses old tool results to just their summary.
 *
 * A "turn" is defined as a user message followed by an assistant response.
 * We count turns by counting user messages that contain actual user text
 * (not just tool results or tool results mixed with skill text).
 */
export function pruneMessages(
  messages: GenericMessage[],
  keepRecentTurns: number,
  toolMetadata?: Map<string, ToolPruningMetadata>,
): void {
  if (messages.length === 0) {
    return
  }

  const metadata = toolMetadata || new Map<string, ToolPruningMetadata>()

  // A user message that contains any tool_result blocks is NOT a real turn —
  // it's a tool response message. Only messages without tool_result blocks
  // (i.e. actual user prompts or system messages) count as turns.
  const { turnCount, turnStartIndices } = countUserTurns(messages)

  // If we have fewer turns than the keep threshold, no pruning needed
  if (turnCount <= keepRecentTurns) {
    return
  }

  // Find the cutoff index - messages before this get pruned
  const cutoffTurnIndex = turnCount - keepRecentTurns
  const cutoffMessageIndex =
    turnStartIndices[cutoffTurnIndex] ?? messages.length

  // Prune messages before the cutoff
  for (let i = 0; i < cutoffMessageIndex; i++) {
    const msg = messages[i]
    if (!msg) continue
    const content = msg.content

    // Only process array content (tool results are in arrays)
    if (!Array.isArray(content)) {
      continue
    }

    if (msg.role === 'assistant') {
      // Compress tool_use inputs in old assistant messages to save tokens
      for (const block of content) {
        if (block.type === 'tool_use') {
          block.input = { _pruned: true }
        }
      }
      continue
    }

    // Everything in this loop is before the cutoff, so it's all old — compress
    // tool results (with the stale-query check) and strip aux blocks.
    compressUserMessageContent(content, messages, i, metadata, {
      volatileCheck: true,
      stripAux: true,
    })
  }
}

/**
 * Prune the live (in-loop) conversation context to bound per-round token cost.
 *
 * Unlike `pruneMessages` (age-based, keyed on user turns, run once per turn),
 * this runs BETWEEN tool-call rounds and is keyed on a token budget over
 * tool-result rounds — so a single user turn that fans out into many tool calls
 * doesn't keep re-sending every verbose query result on every round.
 *
 * Two ordered passes, mutating `messages` in place:
 *  1. Eager volatile eviction: any volatile query result with a later mutation
 *     is stale — collapse it to `{ stale: true }` regardless of recency.
 *  2. Budget recency: walk tool-result relays from the newest, keeping them full
 *     until their estimated size exceeds `tokenBudget`; the newest relay is
 *     always kept full. Compress everything older.
 *
 * Only `tool_result` content and `tool_use` inputs are rewritten and aux
 * text/skill blocks stripped — tool_use/tool_result blocks are never removed, so
 * message validity (pairing, alternation) holds. `reasoning` blocks are left
 * untouched.
 *
 * Cache-safe: the budget cutoff is monotonic (history only grows) and
 * `compressToolResult` is idempotent, so the already-compressed prefix is
 * re-emitted byte-identical and stays cacheable across rounds.
 */
export function pruneLiveContext(
  messages: GenericMessage[],
  toolMetadata: Map<string, ToolPruningMetadata>,
  tokenBudget: number = DEFAULT_LIVE_TOKEN_BUDGET,
): void {
  if (messages.length === 0) return

  // Pass 1: eager volatile eviction. Single backward scan — once a mutation
  // result has been seen, every earlier volatile query result is stale.
  let seenMutationAfter = false
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || msg.role !== 'user' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (block.type !== 'tool_result') continue
      const toolName = findToolNameForResult(messages, i, block.tool_use_id)
      const isVolatile = !!(toolName && toolMetadata.get(toolName)?.volatile)
      if (isVolatile) {
        if (seenMutationAfter) {
          block.content = compressVolatileToolResult(block.content)
        }
        continue
      }
      // Mutation result detection (same heuristic as hasMutationBetween).
      try {
        const parsed = JSON.parse(block.content)
        if (parsed && parsed.success !== undefined) seenMutationAfter = true
      } catch {
        // not JSON, ignore
      }
    }
  }

  // Pass 2: budget recency. Walk tool-result relays from the end, summing the
  // estimated size of full results; the boundary is the first relay that pushes
  // cumulative size past the budget. The newest relay is always kept full.
  let budgetUsed = 0
  let seenNewestRelay = false
  let boundaryIndex = 0 // messages before this index get compressed
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || !isToolResultOnly(msg) || !Array.isArray(msg.content)) continue

    let size = 0
    for (const block of msg.content) {
      // tool_result content is already a string — measure it directly.
      if (block.type === 'tool_result') size += block.content.length / 4
    }

    if (!seenNewestRelay) {
      // Always keep the newest relay full, whatever its size.
      seenNewestRelay = true
      budgetUsed += size
      continue
    }

    budgetUsed += size
    if (budgetUsed > tokenBudget) {
      boundaryIndex = i + 1 // keep this relay and newer; compress older
      break
    }
  }

  if (boundaryIndex === 0) return // everything fits within the budget

  for (let i = 0; i < boundaryIndex; i++) {
    const msg = messages[i]
    if (!msg || !Array.isArray(msg.content)) continue
    if (msg.role === 'assistant') {
      // Only tool_use inputs — leave text/reasoning blocks intact.
      for (const block of msg.content) {
        if (block.type === 'tool_use') block.input = { _pruned: true }
      }
      continue
    }
    // User relays: volatility already handled in pass 1, so skip the (costly)
    // stale check here and just summarize + strip aux blocks.
    compressUserMessageContent(msg.content, messages, i, toolMetadata, {
      volatileCheck: false,
      stripAux: true,
    })
  }
}

/**
 * Create a deep-cloned, aggressively pruned copy of messages for persistence.
 * Does NOT mutate the original array.
 *
 * - Keeps only the last `keepTurns` user turns (non-tool-result user messages)
 * - Compresses ALL tool_result blocks (not just old ones)
 * - Strips tool_use inputs to { _pruned: true } for all but the most recent turn
 */
export function pruneForPersistence(
  messages: GenericMessage[],
  keepTurns: number = PERSISTENCE_KEEP_TURNS,
): GenericMessage[] {
  if (messages.length === 0) return []

  // Deep clone to avoid mutating the original
  const cloned: GenericMessage[] = JSON.parse(JSON.stringify(messages))

  // Identify user turns (messages without tool_result blocks)
  const { turnCount, turnStartIndices } = countUserTurns(cloned)

  // Trim to last keepTurns turns
  let startIndex = 0
  if (turnCount > keepTurns) {
    const cutoffTurnIndex = turnCount - keepTurns
    startIndex = turnStartIndices[cutoffTurnIndex] ?? 0
  }

  const trimmed = cloned.slice(startIndex)

  // Find the last user turn start index (relative to trimmed) for input preservation
  let lastTurnStart = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const msg = trimmed[i]
    if (!msg) continue
    if (msg.role === 'user' && !isToolResultOnly(msg)) {
      lastTurnStart = i
      break
    }
  }

  // Persistence has no tool metadata or "later mutations" to consult, so the
  // volatile/stale path is disabled — every tool_result is compressed normally.
  const emptyMetadata = new Map<string, ToolPruningMetadata>()

  // Compress all tool results and strip old tool_use inputs
  for (let i = 0; i < trimmed.length; i++) {
    const msg = trimmed[i]
    if (!msg) continue
    const content = msg.content
    if (!Array.isArray(content)) continue

    if (msg.role === 'assistant') {
      // Strip tool_use inputs for all but the most recent turn
      if (i < lastTurnStart) {
        for (const block of content) {
          if (block.type === 'tool_use') {
            block.input = { _pruned: true }
          }
        }
      }
      continue
    }

    // User messages: compress ALL tool_result blocks, but only strip auxiliary
    // text/skill blocks from old (pre-last-turn) tool-response messages.
    compressUserMessageContent(content, trimmed, i, emptyMetadata, {
      volatileCheck: false,
      stripAux: i < lastTurnStart,
    })
  }

  return trimmed
}
