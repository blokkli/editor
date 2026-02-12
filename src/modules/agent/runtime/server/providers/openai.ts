import OpenAI from 'openai'
import type {
  ResponseInputItem,
  Tool as ResponseTool,
} from 'openai/resources/responses/responses'
import type {
  AIProvider,
  GenericMessage,
  ProviderConfig,
  StreamOptions,
  StreamEvent,
} from './types'
import type { ClientToolDefinition } from '../../shared/types'

/**
 * Convert generic messages to OpenAI Responses API input items.
 *
 * The Responses API uses a flat list of typed input items instead of role-based
 * messages. Assistant text → EasyInputMessage, tool calls → function_call items,
 * tool results → function_call_output items.
 */
function convertMessages(messages: GenericMessage[]): ResponseInputItem[] {
  const result: ResponseInputItem[] = []

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
      continue
    }

    if (msg.role === 'assistant') {
      const textParts: string[] = []

      for (const block of msg.content) {
        if (block.type === 'text' || block.type === 'skill') {
          textParts.push(block.text)
        } else if (block.type === 'tool_use') {
          // Flush accumulated text as an assistant message before the tool call
          if (textParts.length > 0) {
            result.push({
              role: 'assistant',
              content: textParts.join('\n'),
            })
            textParts.length = 0
          }
          result.push({
            type: 'function_call',
            call_id: block.id,
            name: block.name,
            arguments: JSON.stringify(block.input),
          })
        }
      }

      if (textParts.length > 0) {
        result.push({
          role: 'assistant',
          content: textParts.join('\n'),
        })
      }
    } else if (msg.role === 'user') {
      const textParts: string[] = []

      for (const block of msg.content) {
        if (block.type === 'text' || block.type === 'skill') {
          textParts.push(block.text)
        } else if (block.type === 'tool_result') {
          // Flush text before the tool result
          if (textParts.length > 0) {
            result.push({ role: 'user', content: textParts.join('\n') })
            textParts.length = 0
          }
          result.push({
            type: 'function_call_output',
            call_id: block.tool_use_id,
            output: block.content,
          })
        }
      }

      if (textParts.length > 0) {
        result.push({ role: 'user', content: textParts.join('\n') })
      }
    }
  }

  return result
}

/**
 * Convert client tool definitions to OpenAI Responses API tool format.
 * Uses the flat format: { type, name, description, parameters }.
 */
function convertTools(tools: ClientToolDefinition[]): ResponseTool[] {
  return tools.map((tool) => ({
    type: 'function' as const,
    name: tool.name,
    description: tool.description ?? null,
    parameters: tool.input_schema as Record<string, unknown>,
    strict: false,
  }))
}

/**
 * OpenAI provider using the Responses API.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'

  async *createStream(
    config: ProviderConfig,
    options: StreamOptions,
  ): AsyncIterable<StreamEvent> {
    const client = new OpenAI({ apiKey: config.apiKey })

    const input = convertMessages(options.messages)
    const tools = convertTools(options.tools)

    // Emit the exact tools payload for transcript debugging
    yield { type: 'debug_request', tools }

    const instructions = options.systemPrompt.map((b) => b.text).join('\n\n')

    try {
      const stream = await client.responses.create(
        {
          model: config.model,
          instructions,
          input,
          tools: tools.length > 0 ? tools : undefined,
          max_output_tokens: options.maxTokens ?? 4096,
          stream: true,
          store: false,
        },
        { signal: options.signal },
      )

      let hasFunctionCalls = false

      for await (const event of stream) {
        if (options.signal?.aborted) break

        switch (event.type) {
          // Text streaming
          case 'response.content_part.added':
            if (event.part.type === 'output_text') {
              yield { type: 'text_start' }
            }
            break

          case 'response.output_text.delta':
            yield { type: 'text_delta', text: event.delta }
            break

          case 'response.output_text.done':
            yield { type: 'text_end' }
            break

          // Tool call streaming
          case 'response.output_item.added':
            if (event.item.type === 'function_call') {
              hasFunctionCalls = true
              yield {
                type: 'tool_use_start',
                id: event.item.call_id,
                name: event.item.name,
              }
            }
            break

          case 'response.function_call_arguments.delta':
            yield { type: 'tool_use_delta', partial_json: event.delta }
            break

          case 'response.function_call_arguments.done':
            yield { type: 'tool_use_end' }
            break

          // Completion
          case 'response.completed': {
            const usage = event.response.usage

            let stopReason: StreamEvent & { type: 'message_end' } =
              undefined as never
            if (hasFunctionCalls) {
              stopReason = buildMessageEnd('tool_use', usage)
            } else if (event.response.status === 'incomplete') {
              stopReason = buildMessageEnd('max_tokens', usage)
            } else {
              stopReason = buildMessageEnd('end_turn', usage)
            }

            yield stopReason
            break
          }

          case 'response.failed':
            yield {
              type: 'error',
              error: new Error('OpenAI response failed'),
            }
            break
        }
      }
    } catch (error) {
      yield { type: 'error', error: error as Error }
    }
  }
}

function buildMessageEnd(
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens',
  usage: OpenAI.Responses.ResponseUsage | null | undefined,
): StreamEvent & { type: 'message_end' } {
  const cachedTokens = usage?.input_tokens_details?.cached_tokens ?? 0
  return {
    type: 'message_end',
    stop_reason: stopReason,
    inputTokens: usage ? usage.input_tokens - cachedTokens : undefined,
    outputTokens: usage?.output_tokens,
    cacheReadInputTokens: cachedTokens || undefined,
  }
}

/**
 * Create an OpenAI provider instance.
 */
export function createOpenAIProvider(): AIProvider {
  return new OpenAIProvider()
}
