import Anthropic from '@anthropic-ai/sdk'
import type {
  MessageParam,
  TextBlockParam,
  Tool,
} from '@anthropic-ai/sdk/resources/messages'
import type {
  AIProvider,
  GenericMessage,
  ProviderConfig,
  StreamOptions,
  StreamEvent,
} from './types'
import type { ClientToolDefinition } from '../../shared/types'
import type { SystemPromptBlock } from '../system-prompts/types'
import type { MessageStreamParams } from '@anthropic-ai/sdk/resources'

/**
 * Convert generic messages to Anthropic's MessageParam format.
 */
function convertMessages(messages: GenericMessage[]): MessageParam[] {
  return messages.map((msg) => {
    if (typeof msg.content === 'string') {
      return {
        role: msg.role,
        content: msg.content,
      }
    }

    // Convert content blocks (skip reasoning blocks — they're OpenAI-specific)
    const content = msg.content
      .filter((block) => block.type !== 'reasoning')
      .map((block) => {
        switch (block.type) {
          case 'text':
          case 'skill':
            return { type: 'text' as const, text: block.text }
          case 'tool_use':
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input,
            }
          case 'tool_result':
            return {
              type: 'tool_result' as const,
              tool_use_id: block.tool_use_id,
              content: block.content,
              is_error: block.is_error,
            }
        }
      })

    return {
      role: msg.role,
      content,
    }
  }) as MessageParam[]
}

/**
 * Convert system prompt blocks to Anthropic's TextBlockParam format.
 * Blocks with cacheHint get cache_control for prompt caching.
 */
function convertSystemPrompt(blocks: SystemPromptBlock[]): TextBlockParam[] {
  return blocks.map((block) => {
    const param: TextBlockParam = { type: 'text', text: block.text }
    if (block.cacheHint) {
      ;(
        param as TextBlockParam & { cache_control?: { type: string } }
      ).cache_control = {
        type: block.cacheHint,
      }
    }
    return param
  })
}

/**
 * Convert client tool definitions to Anthropic's Tool format.
 * Places a cache_control breakpoint on the last tool so that the
 * system prompt + tools prefix is cached across turns.
 */
function convertTools(tools: ClientToolDefinition[]): Tool[] {
  return tools.map((tool, i) => {
    const converted: Tool = {
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Tool['input_schema'],
    }
    if (i === tools.length - 1) {
      converted.cache_control = { type: 'ephemeral' }
    }
    return converted
  })
}

/**
 * Anthropic/Claude AI provider implementation.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'

  async *createStream(
    config: ProviderConfig,
    options: StreamOptions,
  ): AsyncIterable<StreamEvent> {
    const client = new Anthropic({ apiKey: config.apiKey })

    const messages = convertMessages(options.messages)
    const tools = convertTools(options.tools)

    const requestParams: MessageStreamParams = {
      model: config.model,
      max_tokens: options.maxTokens ?? 4096,
      system: convertSystemPrompt(options.systemPrompt),
      messages,
      tools,
      ...(options.toolChoice === 'any'
        ? { tool_choice: { type: 'any' as const } }
        : {}),
    }

    if (import.meta.dev) {
      yield { type: 'debug_request', payload: requestParams }
    }

    // Pass the abort signal into the SDK so cancellation tears down the
    // underlying HTTP request immediately, rather than only being noticed when
    // the next stream event arrives (the in-loop `signal.aborted` poll below).
    const stream = client.messages.stream(requestParams, {
      signal: options.signal,
    })

    // Track whether a terminal `message_end` was emitted. Only `message_stop`
    // emits one; if the stream ends without it (abrupt disconnect) we emit a
    // fallback after the loop so the agent loop never hangs waiting for it.
    let messageEnded = false

    // Track the type of the currently-open content block so `content_block_stop`
    // can emit the single matching end event (Anthropic's stop event carries no
    // block type), mirroring the OpenAI provider's one-end-event-per-block
    // contract instead of emitting both and leaning on the consumer to ignore one.
    let openBlockType: 'text' | 'tool_use' | null = null

    try {
      for await (const event of stream) {
        // Check abort signal
        if (options.signal?.aborted) {
          break
        }

        // Map Anthropic events to generic StreamEvents
        switch (event.type) {
          case 'content_block_start':
            if (event.content_block.type === 'text') {
              openBlockType = 'text'
              yield { type: 'text_start' }
            } else if (event.content_block.type === 'tool_use') {
              openBlockType = 'tool_use'
              yield {
                type: 'tool_use_start',
                id: event.content_block.id,
                name: event.content_block.name,
              }
            }
            break

          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'text_delta', text: event.delta.text }
            } else if (event.delta.type === 'input_json_delta') {
              yield {
                type: 'tool_use_delta',
                partial_json: event.delta.partial_json,
              }
            }
            break

          case 'content_block_stop':
            // The stop event carries no block type, so emit the end event for the
            // block we recorded as open at `content_block_start`.
            if (openBlockType === 'text') {
              yield { type: 'text_end' }
            } else if (openBlockType === 'tool_use') {
              yield { type: 'tool_use_end' }
            }
            openBlockType = null
            break

          case 'message_stop': {
            // Get stop reason and usage from the final message
            const finalMessage = await stream.finalMessage()
            yield {
              type: 'message_end',
              stop_reason: finalMessage.stop_reason as
                | 'end_turn'
                | 'tool_use'
                | 'max_tokens'
                | 'stop',
              // Anthropic's `input_tokens` already excludes cached tokens
              // (cache reads/writes are reported separately below), so it is
              // emitted raw. OpenAI's `input_tokens` includes cached tokens, so
              // that provider subtracts them — both ultimately emit the
              // non-cached input count for `inputTokens`.
              inputTokens: finalMessage.usage?.input_tokens,
              outputTokens: finalMessage.usage?.output_tokens,
              cacheCreationInputTokens:
                finalMessage.usage?.cache_creation_input_tokens ?? undefined,
              cacheReadInputTokens:
                finalMessage.usage?.cache_read_input_tokens ?? undefined,
            }
            messageEnded = true
            break
          }
        }
      }

      // Recovery guard: if the stream ended without a `message_stop` (e.g. an
      // abrupt disconnect) and we weren't aborted, emit a terminal event so the
      // agent loop terminates cleanly instead of hanging. Mirrors the OpenAI
      // provider's end-of-stream recovery.
      if (!messageEnded && !options.signal?.aborted) {
        yield { type: 'message_end', stop_reason: 'end_turn' }
      }
    } catch (error) {
      yield { type: 'error', error: error as Error }
    }
  }
}

/**
 * Create an Anthropic provider instance.
 */
export function createAnthropicProvider(): AIProvider {
  return new AnthropicProvider()
}
