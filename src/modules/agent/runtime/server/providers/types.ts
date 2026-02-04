import type { ClientToolDefinition, PageContext } from '../../shared/types'

// ============================================================================
// Generic Message Types
// ============================================================================

/**
 * Text content block in a message.
 */
export type GenericTextBlock = {
  type: 'text'
  text: string
}

/**
 * Tool use content block - assistant requesting tool execution.
 */
export type GenericToolUseBlock = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
}

/**
 * Tool result content block - result of tool execution.
 */
export type GenericToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

/**
 * Content block in a message.
 */
export type GenericContentBlock =
  | GenericTextBlock
  | GenericToolUseBlock
  | GenericToolResultBlock

/**
 * Generic message format used internally.
 * Provider implementations convert to/from this format.
 */
export type GenericMessage = {
  role: 'user' | 'assistant'
  content: string | GenericContentBlock[]
}

// ============================================================================
// Stream Event Types
// ============================================================================

/**
 * Normalized stream events that all providers emit.
 * The agent handler processes these uniformly regardless of provider.
 */
export type StreamEvent =
  | { type: 'text_start' }
  | { type: 'text_delta'; text: string }
  | { type: 'text_end' }
  | { type: 'tool_use_start'; id: string; name: string }
  | { type: 'tool_use_delta'; partial_json: string }
  | { type: 'tool_use_end' }
  | {
      type: 'message_end'
      stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop'
    }
  | { type: 'error'; error: Error }

// ============================================================================
// Provider Configuration
// ============================================================================

/**
 * Configuration passed to provider when creating a stream.
 */
export type ProviderConfig = {
  /** API key for the provider */
  apiKey: string
  /** Model to use (provider-specific) */
  model: string
}

/**
 * Options for creating a stream.
 */
export type StreamOptions = {
  /** System prompt */
  systemPrompt: string
  /** Conversation messages */
  messages: GenericMessage[]
  /** Available tools */
  tools: ClientToolDefinition[]
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Interface that all AI providers must implement.
 */
export interface AIProvider {
  /** Provider name for identification */
  readonly name: string

  /** Default model to use if none specified */
  readonly defaultModel: string

  /**
   * Create a stream of events for the given messages.
   * The provider converts generic messages to its native format,
   * calls the API, and yields normalized StreamEvents.
   */
  createStream(
    config: ProviderConfig,
    options: StreamOptions,
  ): AsyncIterable<StreamEvent>
}
