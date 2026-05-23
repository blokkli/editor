export type AgentProvider = 'anthropic' | 'openai'

// NOTE: kept structurally in sync with `AgentModelDefinition` in
// runtime/shared/types.ts. The two cannot share a file — build and runtime are
// isolated TS projects, so a cross-project import is rejected (TS6307).
export type AgentModelDefinition = {
  name: string
  label: string
  isDefault?: boolean
  routing?: boolean
  pricing?: {
    input: number
    cacheWrite: number
    cacheRead: number
    output: number
  }
}

export type AgentModuleOptionsRoutes = {
  agent: string
  fetch: string
  stream: string
  routing: string
}

export type AgentModuleOptions = {
  /**
   * Allowed origins for the fetch endpoint.
   * URLs that the agent is allowed to fetch content from.
   */
  allowedFetchOrigins?: string[]

  /**
   * AI provider to use.
   * - 'anthropic': Uses Anthropic's Claude models (default)
   * - 'openai': Uses OpenAI's GPT models (requires openai npm package)
   *
   * NOTE: The API key needs to be provided at runtime via runtime config:
   *
   * NUXT_BLOKKLI_AGENT_API_KEY=hunter2
   */
  provider: AgentProvider

  /**
   * Available models for the AI provider.
   *
   * At least one model must be defined. The model marked with `isDefault: true`
   * (or the first model if none is marked) is used for conversations.
   */
  models: AgentModelDefinition[]

  /**
   * Debug the system prompt.
   *
   * If true (and only during dev mode), the system prompt is adjusted to explicitly allow asking about internals (such as available MCP tools, the system prompt itself, etc.).
   */
  debugPrompt?: boolean

  /**
   * Default prompt suggestions shown in the welcome screen.
   *
   * These are displayed as clickable buttons when the conversation is empty.
   */
  defaultPrompts?: string[]

  /**
   * The name of the agent as shown to the user.
   */
  agentName?: string

  routes?: Partial<AgentModuleOptionsRoutes>
}
