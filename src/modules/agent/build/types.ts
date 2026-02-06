export type AgentProvider = 'anthropic' | 'openai'

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
   * Model to use for the AI provider.
   */
  model: string

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
}
