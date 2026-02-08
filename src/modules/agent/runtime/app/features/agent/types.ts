export type AgentConversationData = {
  uuid: string
  title: string
  clientState: string
  serverState: string
  hash: string
}

export type AgentConversationSummary = {
  uuid: string
  title: string
  createdAt: string
  updatedAt: string
}

declare module '#blokkli/editor/types/permissions' {
  interface UserPermissionMap {
    use_agent: 'Use the AI agent.'
  }
}

declare module '#blokkli/editor/adapter' {
  interface BlokkliAdapter<T> {
    /**
     * Swap two blocks.
     */
    swapBlocks?: (
      first: string,
      second: string,
    ) => Promise<MutationResponseLike<T>>

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
  }
}
