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
      let inTextBlock = false
      let currentToolCallId: string | null = null

      for await (const event of stream) {
        if (options.signal?.aborted) break

        switch (event.type) {
          // Text streaming
          case 'response.content_part.added':
            if (event.part.type === 'output_text') {
              inTextBlock = true
              yield { type: 'text_start' }
            }
            break

          case 'response.output_text.delta':
            yield { type: 'text_delta', text: event.delta }
            break

          case 'response.output_text.done':
            inTextBlock = false
            yield { type: 'text_end' }
            break

          // Refusal streaming — map to text events so the user sees the
          // refusal message instead of getting an empty/silent response.
          case 'response.refusal.delta':
            if (!inTextBlock) {
              inTextBlock = true
              yield { type: 'text_start' }
            }
            yield { type: 'text_delta', text: event.delta }
            break

          case 'response.refusal.done':
            if (inTextBlock) {
              inTextBlock = false
              yield { type: 'text_end' }
            }
            break

          // Tool call streaming
          case 'response.output_item.added':
            if (event.item.type === 'function_call') {
              hasFunctionCalls = true
              currentToolCallId = event.item.call_id
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
            currentToolCallId = null
            yield { type: 'tool_use_end' }
            break

          // Safety net: if a function_call item completes but we still
          // have an open tool call (e.g. arguments.done was missed),
          // close it here.
          case 'response.output_item.done':
            if (
              event.item.type === 'function_call' &&
              currentToolCallId === event.item.call_id
            ) {
              currentToolCallId = null
              yield { type: 'tool_use_end' }
            }
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

          // Truncated response (max_output_tokens, content filter).
          // Unlike response.completed, this fires when the response
          // could not finish normally. Close any open blocks and yield
          // message_end so Session.ts can continue the agent loop.
          case 'response.incomplete': {
            if (inTextBlock) {
              inTextBlock = false
              yield { type: 'text_end' }
            }
            if (currentToolCallId) {
              currentToolCallId = null
              yield { type: 'tool_use_end' }
            }

            const usage = event.response.usage
            const stopReason = hasFunctionCalls ? 'tool_use' : 'max_tokens'
            yield buildMessageEnd(stopReason, usage)
            break
          }

          case 'response.failed': {
            const errorMsg =
              event.response?.error?.message || 'OpenAI response failed'
            yield {
              type: 'error',
              error: new Error(errorMsg),
            }
            break
          }

          // Streaming error event (distinct from response.failed).
          case 'error':
            yield {
              type: 'error',
              error: new Error(event.message || 'OpenAI stream error'),
            }
            break

          // Lifecycle events — no action needed.
          // Lifecycle, redundant completions, audio, built-in tools,
          // image generation, server-side MCP, custom hosted tools,
          // and internal reasoning/CoT — all not used.
          case 'response.created':
          case 'response.in_progress':
          case 'response.queued':
          case 'response.content_part.done':
          case 'response.output_text.annotation.added':
          case 'response.audio.delta':
          case 'response.audio.done':
          case 'response.audio.transcript.delta':
          case 'response.audio.transcript.done':
          case 'response.code_interpreter_call.completed':
          case 'response.code_interpreter_call.in_progress':
          case 'response.code_interpreter_call.interpreting':
          case 'response.code_interpreter_call_code.delta':
          case 'response.code_interpreter_call_code.done':
          case 'response.file_search_call.completed':
          case 'response.file_search_call.in_progress':
          case 'response.file_search_call.searching':
          case 'response.web_search_call.completed':
          case 'response.web_search_call.in_progress':
          case 'response.web_search_call.searching':
          case 'response.image_generation_call.completed':
          case 'response.image_generation_call.generating':
          case 'response.image_generation_call.in_progress':
          case 'response.image_generation_call.partial_image':
          case 'response.mcp_call.completed':
          case 'response.mcp_call.failed':
          case 'response.mcp_call.in_progress':
          case 'response.mcp_call_arguments.delta':
          case 'response.mcp_call_arguments.done':
          case 'response.mcp_list_tools.completed':
          case 'response.mcp_list_tools.failed':
          case 'response.mcp_list_tools.in_progress':
          case 'response.custom_tool_call_input.delta':
          case 'response.custom_tool_call_input.done':
          case 'response.reasoning_text.delta':
          case 'response.reasoning_text.done':
          case 'response.reasoning_summary_part.added':
          case 'response.reasoning_summary_part.done':
          case 'response.reasoning_summary_text.delta':
          case 'response.reasoning_summary_text.done':
            console.debug('[blokkli:agent] Unhandled response event: ', event)
            break

          default:
            console.error(
              `[blokkli:agent] Unhandled OpenAI stream event type: ${(event as { type: string }).type}`,
            )
            break
        }
      }

      // Recovery guard: if the stream ended without a terminal event
      // (e.g. abrupt network disconnect), close any open blocks.
      if (inTextBlock) {
        yield { type: 'text_end' }
      }
      if (currentToolCallId) {
        yield { type: 'tool_use_end' }
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
