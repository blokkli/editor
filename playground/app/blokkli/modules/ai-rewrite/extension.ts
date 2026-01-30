import { defineBlokkliAdapterExtension } from '#blokkli/editor/adapter'
import type {
  AdapterRewriteRequest,
  AdapterApplyRewriteRequest,
  RewriteStreamCallback,
  RewriteResult,
  RewriteChunk,
  ToolCallChunk,
} from '../../../../../src/runtime/editor/features/rewrite/types'
import { editState } from '#mock/state'
import { entityStorageManager } from '#mock/entityStorage'
import type { ContentPage } from '#mock/state/Entity/Content'

export default defineBlokkliAdapterExtension((ctx) => ({
  streamRewrite: async (
    request: AdapterRewriteRequest,
    onChunk: RewriteStreamCallback,
    signal?: AbortSignal,
  ): Promise<RewriteResult<any>> => {
    const values: Record<string, Record<string, string>> = {}

    // Initialize values structure
    for (const field of request.fields) {
      if (!values[field.uuid]) {
        values[field.uuid] = {}
      }
      values[field.uuid]![field.fieldName] = ''
    }

    try {
      const response = await fetch('/api/rewrite/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: request.fields,
          prompt: request.prompt,
          history: request.history,
          context: request.context,
          blockContext: request.blockContext,
          useTools: request.useTools,
        }),
        signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process SSE events in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)

              if (parsed.error) {
                throw new Error(parsed.error)
              }

              // Handle tool_call chunks (new tool-based format)
              if (parsed.type === 'tool_call' && parsed.tool) {
                const toolCallChunk: ToolCallChunk = {
                  type: 'tool_call',
                  id: parsed.id,
                  tool: parsed.tool,
                }
                onChunk(toolCallChunk)

                // Also track values for rewrite_text tool calls
                if (parsed.tool.name === 'rewrite_text') {
                  const { uuid, fieldName, value } = parsed.tool.params
                  if (!values[uuid]) {
                    values[uuid] = {}
                  }
                  values[uuid]![fieldName] = value
                }
              }
              // Handle streaming field updates (legacy format)
              else if (parsed.uuid && parsed.fieldName && 'value' in parsed) {
                // Update tracked values
                if (!values[parsed.uuid]) {
                  values[parsed.uuid] = {}
                }
                values[parsed.uuid]![parsed.fieldName] = parsed.value

                // Emit chunk to update UI
                const chunk: RewriteChunk = {
                  uuid: parsed.uuid,
                  fieldName: parsed.fieldName,
                  value: parsed.value,
                  done: !!parsed.done,
                }
                onChunk(chunk)
              }

              // Handle completion signal
              if (parsed.complete) {
                // Final values are already tracked
              }
            } catch (e) {
              // Skip malformed JSON lines during streaming
              if (e instanceof SyntaxError) {
                continue
              }
              throw e
            }
          }
        }
      }

      return {
        success: true,
        values,
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error
      }

      console.error('Rewrite stream error:', error)
      return {
        success: false,
        values: {},
        errors: [(error as Error).message],
      }
    }
  },

  applyRewrite: async (
    request: AdapterApplyRewriteRequest,
  ): Promise<{ success: boolean; state?: any; errors?: string[] }> => {
    // Add the rewrite mutation to persist the changes
    editState.addMutation('apply_rewrite', {
      values: request.values,
      toolCalls: request.toolCalls,
    })

    // Get the entity from storage to compute mutated state
    const entity = entityStorageManager.getContent(
      ctx.value.entityUuid,
    ) as ContentPage

    if (!entity) {
      return {
        success: false,
        errors: ['Entity not found'],
      }
    }

    // Get the updated state to return
    const mutatedState = await editState.getMutatedState(entity)

    return {
      success: true,
      state: mutatedState,
    }
  },
}))
