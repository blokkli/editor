import type { GenericMessage } from '../../shared/types'

/**
 * Message-structure utilities shared across the server: predicates and
 * validation over the `GenericMessage[]` conversation array. Pruning builds on
 * these; the agent loop uses them for turn indexing and pre-send validation.
 */

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
