import {
  conversationItemSchema,
  type ConversationItem,
} from '#blokkli/agent/app/types'
import { generateId } from '#blokkli/agent/app/helpers/id'
import type {
  ConversationStateSnapshot,
  UsageTurn,
} from '#blokkli/agent/shared/types'
import type {
  AgentConversationData,
  AgentConversationFeedbackItem,
  AgentConversationHostInfo,
} from '#blokkli/agent/app/features/agent/types'
import type { BlokkliUser } from '#blokkli/editor/types/user'

export type ParsedConversation = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
  host: AgentConversationHostInfo | null
  author: BlokkliUser | null
  conversation: ConversationItem[]
  usageTurns: UsageTurn[]
  serverState: ConversationStateSnapshot
  feedbackItemIds: string[]
  feedback: AgentConversationFeedbackItem[]
}

/**
 * Parse a stored conversation into the runtime shape used by the conversation
 * rendering. Pure — does not touch any reactive state — so it can be reused by
 * both the live editor session (which then applies it via the provider) and
 * the admin moderation modal (which renders it read-only).
 *
 * Returns null if the stored data is missing required pieces or fails to
 * parse; callers should treat that as "unrenderable".
 */
export function parseConversationData(
  data: AgentConversationData,
): ParsedConversation | null {
  try {
    const parsed: {
      conversation?: unknown[]
      usageTurns?: UsageTurn[]
    } = JSON.parse(data.clientState)

    if (!parsed.conversation?.length) return null

    const clientConversation: ConversationItem[] = parsed.conversation.map(
      (item) => {
        const result = conversationItemSchema.safeParse(item)
        if (result.success) return result.data
        return {
          type: 'unknown' as const,
          id: generateId(),
          timestamp: Date.now(),
        }
      },
    )

    const serverParsed: {
      messages: ConversationStateSnapshot['messages']
      activatedLazyTools: ConversationStateSnapshot['activatedLazyTools']
    } = JSON.parse(data.serverState)

    if (!serverParsed?.messages?.length) return null

    return {
      uuid: data.uuid,
      title: data.title,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      host: data.host,
      author: data.author,
      conversation: clientConversation,
      usageTurns: parsed.usageTurns ?? [],
      feedbackItemIds: data.feedbackItemIds ?? [],
      feedback: data.feedback ?? [],
      serverState: {
        messages: serverParsed.messages,
        activatedLazyTools: serverParsed.activatedLazyTools,
        hash: data.hash,
      },
    }
  } catch {
    return null
  }
}
