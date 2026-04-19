import type { AgentPromptDefinition } from '#blokkli/agent/app/types'

/**
 * A pending request from the outer feature's item-dropdown action that the
 * inner container consumes on mount (or on change if already mounted).
 */
export type PendingPromptRequest = {
  prompt: AgentPromptDefinition
  selectedUuids: string[]
}

export type AgentConversationData = {
  uuid: string
  title: string
  clientState: string
  serverState: string
  hash: string
  feedbackItemIds?: string[]
}

export type AgentConversationSummary = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
}

export type AgentConversationFeedbackRating = 'bad' | 'fine' | 'good'

export type AgentConversationFeedback = {
  conversationId: string
  rating: AgentConversationFeedbackRating
  lastItemId: string
  comment?: string
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    use_agent: 'Use the AI agent.'
  }
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Rearrange blocks within a field by specifying the desired order.
     *
     * All provided UUIDs must belong to the same field. The blocks
     * are reordered to match the given UUID array order.
     */
    rearrangeBlocks?: (e: {
      host: import('#blokkli/editor/types/field').BlokkliItemHost
      uuids: string[]
    }) => Promise<MutationResponseLike<T>>

    /**
     * Get an authentication token for the agent WebSocket connection.
     *
     * The token is included in the WebSocket init message and validated
     * server-side using HMAC. The adapter should obtain the token from
     * an authenticated CMS endpoint.
     */
    getAgentAuthToken?: () => Promise<string | null>

    /**
     * Manage persisted agent conversations for the current entity.
     *
     * Each conversation is stored as a structured record with separate
     * fields for client state, server state, and the HMAC hash.
     * Timestamps (createdAt, updatedAt) are managed by the backend.
     */
    agentConversations?: {
      upsert: (data: AgentConversationData) => Promise<boolean>
      load: (uuid: string) => Promise<AgentConversationData | null>
      loadLatest: () => Promise<AgentConversationData | null>
      list: () => Promise<AgentConversationSummary[]>
      delete: (uuid: string) => Promise<boolean>
    }

    /**
     * Submit user feedback for an agent conversation.
     *
     * Feedback is stored separately from the conversation data and should
     * survive conversation deletion. The lastItemId references the
     * conversation item visible when the user gave feedback.
     */
    submitConversationFeedback?: (
      feedback: AgentConversationFeedback,
    ) => Promise<boolean>
  }
}
