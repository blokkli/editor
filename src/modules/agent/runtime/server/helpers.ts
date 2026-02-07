import type { AgentErrorType, PageContext } from '../shared/types'
import type { GenericMessage } from './providers/types'
import type { ResolvedSkill, SkillDefinition } from './skills/types'
import { skills } from '#blokkli-build/agent-server'

export const DEBUG_LOGGING = true

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

/**
 * Compress a tool result to reduce token usage.
 * Extracts just the essential information from the result.
 */
export function compressToolResult(content: string): string {
  try {
    const parsed = JSON.parse(content)

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
 * Prune old messages to reduce context size.
 * Keeps recent messages intact, compresses old tool results to just their summary.
 *
 * A "turn" is defined as a user message followed by an assistant response.
 * We count turns by counting user messages (since each user message starts a turn).
 */
export function pruneMessages(
  messages: GenericMessage[],
  keepRecentTurns: number,
): void {
  if (messages.length === 0) {
    return
  }

  // Count user messages to determine turns
  // Each user message (that's not just tool results) represents a new turn
  let turnCount = 0
  const turnStartIndices: number[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role === 'user') {
      // Check if this is a "real" user message vs tool results
      // Tool results are arrays of { type: 'tool_result', ... }
      const content = msg.content
      const isToolResultOnly =
        Array.isArray(content) &&
        content.length > 0 &&
        content.every(
          (block) =>
            typeof block === 'object' &&
            block !== null &&
            'type' in block &&
            block.type === 'tool_result',
        )

      if (!isToolResultOnly) {
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

  if (DEBUG_LOGGING) {
    console.log(
      `\n[Pruning] ${turnCount} turns total, keeping ${keepRecentTurns} recent, pruning messages before index ${cutoffMessageIndex}`,
    )
  }

  // Prune messages before the cutoff
  for (let i = 0; i < cutoffMessageIndex; i++) {
    const msg = messages[i]
    const content = msg.content

    // Only process array content (tool results are in arrays)
    if (!Array.isArray(content)) {
      continue
    }

    // Compress tool_result blocks
    for (let j = 0; j < content.length; j++) {
      const block = content[j]
      if (block.type === 'tool_result') {
        const originalSize = block.content.length
        block.content = compressToolResult(block.content)

        if (DEBUG_LOGGING && originalSize > block.content.length) {
          console.log(
            `[Pruning] Compressed tool result: ${originalSize} -> ${block.content.length} chars`,
          )
        }
      }
    }
  }
}
