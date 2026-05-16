import type { AgentPromptDefinition } from '#blokkli/agent/app/types'
import type { BlokkliUser } from '#blokkli/editor/types/user'
import type { AdapterSearchArguments } from '#blokkli/editor/adapter'
import type { PluginConfigInput } from '#blokkli/editor/types/pluginConfig'

/**
 * A pending request from the outer feature's item-dropdown action that the
 * inner container consumes on mount (or on change if already mounted).
 */
export type PendingPromptRequest = {
  prompt: AgentPromptDefinition
  selectedUuids: string[]
}

export type AgentConversationHostInfo = {
  entityType: string
  entityUuid: string
  label?: string | null
  editUrl?: string | null
}

export type AgentConversationItem = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
  host: AgentConversationHostInfo | null
  author: BlokkliUser
}

export type AgentConversationItemSummary = Omit<
  AgentConversationItem,
  'host' | 'author'
>

export type AgentConversationData = AgentConversationItem & {
  clientState: string
  serverState: string
  hash: string
  feedbackItemIds?: string[]
  feedback?: AgentConversationFeedbackItem[]
}

export type AgentConversationUpsert = Pick<
  AgentConversationData,
  'uuid' | 'title' | 'clientState' | 'serverState' | 'hash'
>

export type AgentConversationFeedbackRating = 'bad' | 'fine' | 'good'

export type AgentConversationFeedback = {
  conversationId: string
  rating: AgentConversationFeedbackRating
  lastItemId: string
  comment?: string
}

export type AgentConversationFeedbackItem = {
  id: string
  createdAt: string
  rating: AgentConversationFeedbackRating
  comment: string | null
  itemId: string
  author: BlokkliUser
  conversationUuid: string
}

export type AgentConversationQueryResult = {
  filters: PluginConfigInput[]
  items: AgentConversationItem[]
  total: number
  perPage: number
}

export type AgentConversationFeedbackQueryResult = {
  filters: PluginConfigInput[]
  items: AgentConversationFeedbackItem[]
  total: number
  perPage: number
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    use_agent: 'Use the AI agent.'
    manage_agent_conversations: 'Browse and delete agent conversations across all entities and users.'
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
     * Manage persisted agent conversations.
     *
     * Each conversation is stored as a structured record with separate
     * fields for client state, server state, and the HMAC hash.
     * Timestamps (createdAt, updatedAt) are managed by the backend.
     */
    agentConversations?: {
      upsert: (data: AgentConversationUpsert) => Promise<boolean>

      /**
       * Load a conversation by its globally unique UUID. The backend
       * authorizes based on conversation ownership or the
       * `manage_agent_conversations` permission.
       */
      load: (uuid: string) => Promise<AgentConversationData | null>

      /**
       * Load the most recently updated conversation for the current host
       * entity (the entity the editor is open on).
       */
      loadLatest: () => Promise<AgentConversationData | null>

      /**
       * List conversations for the current host entity.
       */
      list: () => Promise<AgentConversationItemSummary[]>

      delete: (uuid: string) => Promise<boolean>

      /**
       * Submit user feedback for a conversation item. Feedback is stored
       * separately from conversation data and should survive conversation
       * deletion. The `lastItemId` references the item visible when the
       * user submitted the rating.
       */
      submitFeedback?: (feedback: AgentConversationFeedback) => Promise<boolean>

      /**
       * Query conversations across all host entities and users, with
       * pagination. Ordered newest first. The shape mirrors
       * `mediaLibraryGetResults` so the same paginated-list pattern can
       * be reused on the consumer side.
       *
       * Backends must enforce the `manage_agent_conversations` permission
       * server-side. The frontend gates the UI but never trusts it.
       */
      queryConversations?: (
        e: AdapterSearchArguments,
      ) => Promise<AgentConversationQueryResult>

      /**
       * Query feedback ratings across all conversations and users, with
       * pagination. Ordered newest first. Each entry is joined with its
       * parent conversation so the consumer can render without a second
       * roundtrip per row. The shape mirrors `mediaLibraryGetResults`.
       *
       * Backends must enforce the `manage_agent_conversations` permission
       * server-side.
       */
      queryFeedback?: (
        e: AdapterSearchArguments,
      ) => Promise<AgentConversationFeedbackQueryResult>
    }
  }
}
