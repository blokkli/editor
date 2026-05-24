import type { Peer } from 'crossws'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  AgentErrorType,
  AgentModelDefinition,
  ConversationStateSnapshot,
  PageContext,
  ServerMessage,
  GenericMessage,
  GenericContentBlock,
  UsageTurn,
} from '../../shared/types'
import type { ResolvedSkill, SkillDefinition } from '../skills/types'
import { skills } from '#blokkli-build/agent-server'

export function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}

/** Number of recent turns to keep uncompressed when pruning messages */
export const KEEP_RECENT_TURNS = 8

/**
 * Returns true when a message is a tool-result relay (`{role:'user',
 * content:[tool_result, ...]}`) rather than a real user turn. The protocol
 * encodes tool results as user-role messages, so distinguishing them is
 * required wherever we count "real" user turns — pruning, persistence,
 * rollback indexing.
 */
export function isToolResultOnly(msg: GenericMessage): boolean {
  if (msg.role !== 'user') return false
  const content = msg.content
  if (!Array.isArray(content) || content.length === 0) return false
  return content.some(
    (block) =>
      typeof block === 'object' &&
      block !== null &&
      'type' in block &&
      block.type === 'tool_result',
  )
}

/**
 * Resolve a skill label to a string, optionally using the given language.
 */
export function resolveSkillLabel(
  label: SkillDefinition['label'],
  language?: string,
): string {
  if (typeof label === 'string') return label
  if (language && language in label) {
    return label[language as keyof typeof label] || label.en
  }
  return label.en
}

/**
 * Resolve skills for the given page context.
 * Calls getContents on each skill and filters out nulls.
 */
export function resolveSkills(context: PageContext): ResolvedSkill[] {
  return skills
    .map((skill) => {
      const content = skill.getContents(context)
      if (content === null) return null
      return {
        name: skill.name,
        label: resolveSkillLabel(skill.label, context.interfaceLanguage),
        englishLabel: resolveSkillLabel(skill.label),
        description: skill.description,
        content,
        tools: skill.tools ?? [],
      }
    })
    .filter((s): s is ResolvedSkill => s !== null)
}

/**
 * Transform text before sending to client or storing in conversation.
 * Replaces ß with ss for Swiss German audiences.
 */
export function transformText(text: string): string {
  return text.replace(/ß/g, 'ss')
}

/**
 * Classify an API error into a structured error with type, message, and detail.
 * Works with both Anthropic and OpenAI SDK errors (both use HTTP status codes).
 */
export function classifyError(error: unknown): {
  errorType: AgentErrorType
  message: string
  detail?: string
} {
  if (!(error instanceof Error)) {
    return {
      errorType: 'unknown',
      message: 'An unexpected error occurred.',
    }
  }

  const detail = error.message || undefined

  // Both Anthropic and OpenAI SDK APIError classes expose .status
  const status = (error as Error & { status?: number }).status

  // Connection errors have no status (e.g. APIConnectionError in both SDKs)
  if (status === undefined) {
    if (error.constructor.name === 'APIConnectionError') {
      return {
        errorType: 'connection',
        message: 'Could not connect to the AI service.',
        detail,
      }
    }
    return {
      errorType: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      detail,
    }
  }

  // Map by HTTP status code (works for both Anthropic and OpenAI)
  switch (status) {
    case 401:
      return {
        errorType: 'authentication',
        message: 'API authentication failed. Please check your API key.',
        detail,
      }
    case 400:
      return {
        errorType: 'bad_request',
        message: 'The request to the AI service was invalid.',
        detail,
      }
    case 404:
      return {
        errorType: 'not_found',
        message:
          'The configured AI model was not found. Please check the configuration.',
        detail,
      }
    case 429:
      return {
        errorType: 'rate_limit',
        message:
          'Rate limit exceeded. Please wait a moment before trying again.',
        detail,
      }
    case 529:
    case 503:
      return {
        errorType: 'overloaded',
        message:
          'The AI service is currently overloaded. Please try again in a moment.',
        detail,
      }
    default:
      return {
        errorType: 'unknown',
        message: `API error (${status}).`,
        detail,
      }
  }
}

// ============================================================================
// Auth tokens
// ============================================================================

/** Seconds an agent auth token remains valid after issuance. */
export const TOKEN_EXPIRY_SECONDS = 300

/**
 * Validate an HMAC auth token: well-formed `<timestamp>:<hmac>`, not expired,
 * and HMAC matches. Does NOT track one-time use — `SessionManager` layers its
 * replay check on top. Returns false (never throws) on any malformed input.
 */
export function validateToken(token: string, secret: string): boolean {
  if (!secret || !token) return false

  const colonIndex = token.indexOf(':')
  if (colonIndex === -1) return false

  const timestampStr = token.substring(0, colonIndex)
  const providedHmac = token.substring(colonIndex + 1)

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > TOKEN_EXPIRY_SECONDS) return false

  const expectedHmac = createHmac('sha256', secret)
    .update(timestampStr)
    .digest('hex')

  if (providedHmac.length !== expectedHmac.length) return false

  try {
    return timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    )
  } catch {
    return false
  }
}

// ============================================================================
// Models & usage
// ============================================================================

/**
 * The model used for the main agent loop: the one flagged `isDefault`, or the
 * first configured model as a fallback.
 */
export function getDefaultModel(
  models: AgentModelDefinition[],
): AgentModelDefinition | undefined {
  return models.find((m) => m.isDefault) || models[0]
}

/**
 * Build a `UsageTurn` from a provider `message_end` event and the model that
 * produced it (for pricing). Returns undefined when token counts are absent,
 * so callers can skip emitting a usage message.
 */
export function createUsageTurn(
  event: {
    inputTokens?: number
    outputTokens?: number
    cacheCreationInputTokens?: number
    cacheReadInputTokens?: number
  },
  model: AgentModelDefinition | null | undefined,
): UsageTurn | undefined {
  if (event.inputTokens === undefined || event.outputTokens === undefined) {
    return undefined
  }
  return {
    inputTokens: event.inputTokens,
    outputTokens: event.outputTokens,
    cacheCreationInputTokens: event.cacheCreationInputTokens ?? 0,
    cacheReadInputTokens: event.cacheReadInputTokens ?? 0,
    pricing: model?.pricing ?? null,
  }
}

// ============================================================================
// Pruning Types
// ============================================================================

/**
 * Metadata about a tool used during message pruning.
 */
export type ToolPruningMetadata = {
  volatile?: boolean
}

// ============================================================================
// Pruning Helpers
// ============================================================================

/**
 * Find the tool name for a tool_result block by looking up the matching
 * tool_use block in the preceding assistant message.
 */
export function findToolNameForResult(
  messages: GenericMessage[],
  userMsgIndex: number,
  toolUseId: string,
): string | undefined {
  // The assistant message with the matching tool_use should be immediately before
  for (let i = userMsgIndex - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg) continue
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (block.type === 'tool_use' && block.id === toolUseId) {
        return block.name
      }
    }
    // Only check the immediately preceding assistant message
    break
  }
  return undefined
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
 * Count "real" user turns and record where each starts.
 *
 * A "turn" is a user message that contains actual user text — NOT a tool-response
 * message (one carrying `tool_result` blocks). Shared by both prune functions,
 * which use the turn boundaries to decide how much recent history to keep intact.
 */
export function countUserTurns(messages: GenericMessage[]): {
  turnCount: number
  turnStartIndices: number[]
} {
  let turnCount = 0
  const turnStartIndices: number[] = []
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (!msg) continue
    if (msg.role === 'user' && !isToolResultOnly(msg)) {
      turnCount++
      turnStartIndices.push(i)
    }
  }
  return { turnCount, turnStartIndices }
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
 * Estimated token budget for full tool-result content kept in the live (in-loop)
 * context. Tunable. The newest tool-result round is always kept full regardless,
 * so this caps the *older* results, not the freshly-read one.
 */
export const DEFAULT_LIVE_TOKEN_BUDGET = 6000

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

// ============================================================================
// Persistence Helpers
// ============================================================================

/** Number of recent turns to keep when pruning for persistence */
const PERSISTENCE_KEEP_TURNS = 7

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

/**
 * Compute an HMAC-SHA256 hash for a conversation state snapshot.
 */
export function computeStateHash(
  messages: GenericMessage[],
  activatedLazyTools: string[],
  secret: string,
): string {
  const payload =
    JSON.stringify(messages) + '|' + JSON.stringify(activatedLazyTools)
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Verify the HMAC hash of a conversation state snapshot.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyStateHash(
  snapshot: ConversationStateSnapshot,
  secret: string,
): boolean {
  // Fail closed when no secret is configured. An empty secret still produces a
  // deterministic HMAC that the client could reproduce, so without this guard
  // forged conversation state would verify. Mirrors the auth-token path, which
  // also rejects on `!authSecret`.
  if (!secret) return false

  const expected = computeStateHash(
    snapshot.messages,
    snapshot.activatedLazyTools,
    secret,
  )
  if (expected.length !== snapshot.hash.length) return false
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(snapshot.hash, 'hex'),
    )
  } catch {
    return false
  }
}

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Validate message array for issues that would cause API errors.
 * Returns an array of issue descriptions (empty if valid).
 */
export function validateMessages(messages: GenericMessage[]): string[] {
  const issues: string[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (!msg) continue

    // Check for consecutive same-role messages
    const prevMsg = i > 0 ? messages[i - 1] : undefined
    if (prevMsg && prevMsg.role === msg.role) {
      issues.push(
        `Consecutive ${msg.role} messages at indices ${i - 1} and ${i}`,
      )
    }

    // Check for empty content
    if (Array.isArray(msg.content) && msg.content.length === 0) {
      issues.push(`Empty content array in ${msg.role} message at index ${i}`)
    }

    // Check for orphaned tool_result (no matching tool_use in preceding assistant)
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          const toolName = findToolNameForResult(messages, i, block.tool_use_id)
          if (!toolName) {
            issues.push(
              `Orphaned tool_result for ${block.tool_use_id} at message index ${i}`,
            )
          }
        }
      }
    }

    // Check for orphaned tool_use (no matching tool_result in following user message)
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_use') {
          const nextMsg = messages[i + 1]
          if (!nextMsg || nextMsg.role !== 'user') {
            issues.push(
              `tool_use "${block.name}" (${block.id}) at message index ${i} has no following user message`,
            )
            continue
          }
          if (!Array.isArray(nextMsg.content)) {
            issues.push(
              `tool_use "${block.name}" (${block.id}) at message index ${i} has no matching tool_result`,
            )
            continue
          }
          const hasResult = nextMsg.content.some(
            (b) => b.type === 'tool_result' && b.tool_use_id === block.id,
          )
          if (!hasResult) {
            issues.push(
              `tool_use "${block.name}" (${block.id}) at message index ${i} has no matching tool_result`,
            )
          }
        }
      }
    }
  }

  return issues
}
