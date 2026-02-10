import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import type {
  AIProvider,
  GenericMessage,
  ProviderConfig,
  StreamOptions,
  StreamEvent,
} from './types'
import type { ClientToolDefinition } from '../../shared/types'

/**
 * Convert generic messages to OpenAI's ChatCompletionMessageParam format.
 * OpenAI handles system prompts separately and uses role: 'tool' for tool results.
 */
function convertMessages(
  messages: GenericMessage[],
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({
        role: msg.role,
        content: msg.content,
      })
      continue
    }

    // Process content blocks
    if (msg.role === 'assistant') {
      // Assistant messages with tool calls
      const textParts: string[] = []
      const toolCalls: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }> = []

      for (const block of msg.content) {
        if (
          block.type === 'text' ||
          block.type === 'skill' ||
          block.type === 'page_structure'
        ) {
          textParts.push(block.text)
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          })
        }
      }

      const assistantMsg: ChatCompletionMessageParam = {
        role: 'assistant',
        content: textParts.length > 0 ? textParts.join('\n') : null,
      }

      if (toolCalls.length > 0) {
        ;(assistantMsg as { tool_calls?: typeof toolCalls }).tool_calls =
          toolCalls
      }

      result.push(assistantMsg)
    } else if (msg.role === 'user') {
      // User messages might contain tool results
      for (const block of msg.content) {
        if (
          block.type === 'text' ||
          block.type === 'skill' ||
          block.type === 'page_structure'
        ) {
          result.push({
            role: 'user',
            content: block.text,
          })
        } else if (block.type === 'tool_result') {
          result.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content: block.content,
          })
        }
      }
    }
  }

  return result
}

/**
 * Convert client tool definitions to OpenAI's function format.
 */
function convertTools(tools: ClientToolDefinition[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema as Record<string, unknown>,
    },
  }))
}

/**
 * OpenAI provider implementation.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'

  async *createStream(
    config: ProviderConfig,
    options: StreamOptions,
  ): AsyncIterable<StreamEvent> {
    const client = new OpenAI({ apiKey: config.apiKey })

    const messages = convertMessages(options.messages)
    const tools = convertTools(options.tools)

    // Prepend system message (concatenate blocks — OpenAI caches by prefix automatically)
    const systemText = options.systemPrompt.map((b) => b.text).join('\n\n')
    const allMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemText },
      ...messages,
    ]

    try {
      const stream = await client.chat.completions.create({
        model: config.model,
        max_completion_tokens: options.maxTokens ?? 4096,
        messages: allMessages,
        tools: tools.length > 0 ? tools : undefined,
        stream: true,
        stream_options: { include_usage: true },
      })

      // Track state for reconstructing tool calls from deltas
      let currentTextStarted = false
      const toolCallState = new Map<
        number,
        { id: string; name: string; arguments: string }
      >()
      const toolCallsStarted = new Set<number>()
      let pendingStopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop' =
        'stop'

      for await (const chunk of stream) {
        // Check abort signal
        if (options.signal?.aborted) {
          break
        }

        // Final chunk with usage has no choices — emit message_end with usage
        const choice = chunk.choices[0]
        if (!choice) {
          if (chunk.usage) {
            yield {
              type: 'message_end',
              stop_reason: pendingStopReason,
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
              cacheReadInputTokens:
                chunk.usage.prompt_tokens_details?.cached_tokens ?? undefined,
            }
          }
          continue
        }

        const delta = choice.delta

        // Handle text content
        if (delta.content) {
          if (!currentTextStarted) {
            yield { type: 'text_start' }
            currentTextStarted = true
          }
          yield { type: 'text_delta', text: delta.content }
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index

            // Initialize state for this tool call if needed
            if (!toolCallState.has(index)) {
              toolCallState.set(index, {
                id: '',
                name: '',
                arguments: '',
              })
            }

            const state = toolCallState.get(index)!

            // Update state with delta
            if (toolCall.id) {
              state.id = toolCall.id
            }
            if (toolCall.function?.name) {
              state.name = toolCall.function.name
            }
            if (toolCall.function?.arguments) {
              state.arguments += toolCall.function.arguments
            }

            // Emit tool_use_start when we have id and name
            if (state.id && state.name && !toolCallsStarted.has(index)) {
              // End any ongoing text block first
              if (currentTextStarted) {
                yield { type: 'text_end' }
                currentTextStarted = false
              }

              yield {
                type: 'tool_use_start',
                id: state.id,
                name: state.name,
              }
              toolCallsStarted.add(index)
            }

            // Emit argument deltas
            if (toolCall.function?.arguments && toolCallsStarted.has(index)) {
              yield {
                type: 'tool_use_delta',
                partial_json: toolCall.function.arguments,
              }
            }
          }
        }

        // Handle finish — defer message_end until usage chunk arrives
        if (choice.finish_reason) {
          // End any ongoing text block
          if (currentTextStarted) {
            yield { type: 'text_end' }
            currentTextStarted = false
          }

          // End all tool calls
          for (const _ of toolCallsStarted) {
            yield { type: 'tool_use_end' }
          }

          // Map OpenAI finish reasons to our stop reasons
          switch (choice.finish_reason) {
            case 'stop':
              pendingStopReason = 'end_turn'
              break
            case 'tool_calls':
              pendingStopReason = 'tool_use'
              break
            case 'length':
              pendingStopReason = 'max_tokens'
              break
            default:
              pendingStopReason = 'stop'
          }
        }
      }
    } catch (error) {
      yield { type: 'error', error: error as Error }
    }
  }
}

/**
 * Create an OpenAI provider instance.
 */
export function createOpenAIProvider(): AIProvider {
  return new OpenAIProvider()
}
