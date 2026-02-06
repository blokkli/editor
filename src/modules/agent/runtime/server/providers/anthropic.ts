import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, Tool } from '@anthropic-ai/sdk/resources/messages'
import type {
  AIProvider,
  GenericMessage,
  ProviderConfig,
  StreamOptions,
  StreamEvent,
} from './types'
import type { ClientToolDefinition } from '../../shared/types'

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

    // Convert content blocks
    const content = msg.content.map((block) => {
      switch (block.type) {
        case 'text':
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
 * Convert client tool definitions to Anthropic's Tool format.
 */
function convertTools(tools: ClientToolDefinition[]): Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Tool['input_schema'],
  }))
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

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt,
      messages,
      tools,
    })

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
              yield { type: 'text_start' }
            } else if (event.content_block.type === 'tool_use') {
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
            // We don't know if it was text or tool_use from the stop event alone,
            // but the agent handler tracks this state
            // Emit both end events - handler will use the appropriate one based on its state
            yield { type: 'text_end' }
            yield { type: 'tool_use_end' }
            break

          case 'message_stop': {
            // Get stop reason from the final message
            const finalMessage = await stream.finalMessage()
            yield {
              type: 'message_end',
              stop_reason: finalMessage.stop_reason as
                | 'end_turn'
                | 'tool_use'
                | 'max_tokens'
                | 'stop',
            }
            break
          }
        }
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
