import type { ClientToolDefinition, GenericMessage } from '../../shared/types'
import type { SystemPromptBlock } from '../system-prompts/types'

// Re-export generic message types from shared (moved there for client access)
export type {
  GenericTextBlock,
  GenericToolUseBlock,
  GenericToolResultBlock,
  GenericReasoningBlock,
  GenericContentBlock,
  GenericMessage,
} from '../../shared/types'

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
      type: 'reasoning_summary'
      id: string
      text: string
      encryptedContent?: string
    }
  | {
      type: 'message_end'
      stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop'
      inputTokens?: number
      outputTokens?: number
      cacheCreationInputTokens?: number
      cacheReadInputTokens?: number
    }
  | { type: 'error'; error: Error }
  | { type: 'debug_request'; payload: unknown }

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
  /** System prompt blocks with optional cache hints */
  systemPrompt: SystemPromptBlock[]
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
