import type { Peer } from 'crossws'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  AgentErrorType,
  ConversationStateSnapshot,
  PageContext,
  ServerMessage,
  GenericMessage,
} from '../shared/types'
import type { ResolvedSkill, SkillDefinition } from './skills/types'
import { skills } from '#blokkli-build/agent-server'

export function send(peer: Peer, message: ServerMessage): void {
  peer.send(JSON.stringify(message))
}

/** Number of recent turns to keep uncompressed when pruning messages */
export const KEEP_RECENT_TURNS = 8

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
 * query ran, so the data is stale.
 */
function compressVolatileToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content)
    const summary = parsed._summary || 'page state has changed since this query'
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

  // Count user messages to determine turns.
  // A user message that contains any tool_result blocks is NOT a real turn —
  // it's a tool response message. Only messages without tool_result blocks
  // (i.e. actual user prompts or system messages) count as turns.
  let turnCount = 0
  const turnStartIndices: number[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role === 'user') {
      const content = msg.content
      // Bug 4 fix: use .some() instead of .every() — a message with tool_results
      // mixed with text blocks (e.g. skill injections) is still a tool response,
      // not a real user turn.
      const containsToolResult =
        Array.isArray(content) &&
        content.length > 0 &&
        content.some(
          (block) =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'tool_result',
        )

      if (!containsToolResult) {
        turnCount++
        turnStartIndices.push(i)
      }
    }
  }

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

    // User messages: compress tool_result blocks and remove text blocks
    for (let j = content.length - 1; j >= 0; j--) {
      const block = content[j]
      if (block.type === 'tool_result') {
        const toolName = findToolNameForResult(messages, i, block.tool_use_id)
        const meta = toolName ? metadata.get(toolName) : undefined

        // If the tool is volatile and a mutation happened after it, mark as stale
        if (
          meta?.volatile &&
          hasMutationBetween(messages, i, messages.length, metadata)
        ) {
          block.content = compressVolatileToolResult(block.content)
        } else {
          block.content = compressToolResult(block.content)
        }
      } else if (block.type === 'text' || block.type === 'skill') {
        content.splice(j, 1)
      }
    }
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
  let turnCount = 0
  const turnStartIndices: number[] = []

  for (let i = 0; i < cloned.length; i++) {
    const msg = cloned[i]
    if (msg.role === 'user') {
      const content = msg.content
      const containsToolResult =
        Array.isArray(content) &&
        content.length > 0 &&
        content.some(
          (block) =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'tool_result',
        )

      if (!containsToolResult) {
        turnCount++
        turnStartIndices.push(i)
      }
    }
  }

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
    if (msg.role === 'user') {
      const content = msg.content
      const containsToolResult =
        Array.isArray(content) &&
        content.length > 0 &&
        content.some(
          (block) =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'tool_result',
        )
      if (!containsToolResult) {
        lastTurnStart = i
        break
      }
    }
  }

  // Compress all tool results and strip old tool_use inputs
  for (let i = 0; i < trimmed.length; i++) {
    const msg = trimmed[i]
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

    // User messages: compress ALL tool_result blocks, remove text blocks in old turns
    for (let j = content.length - 1; j >= 0; j--) {
      const block = content[j]
      if (block.type === 'tool_result') {
        block.content = compressToolResult(block.content)
      } else if (block.type === 'text' && i < lastTurnStart) {
        content.splice(j, 1)
      }
    }
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

    // Check for consecutive same-role messages
    if (i > 0 && messages[i - 1].role === msg.role) {
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
