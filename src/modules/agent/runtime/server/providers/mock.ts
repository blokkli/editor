import type {
  AIProvider,
  ProviderConfig,
  StreamEvent,
  StreamOptions,
} from './types'
import type { GenericContentBlock, MockScript } from '../../shared/types'

/**
 * Internal turn representation derived from a script's `agent` entries.
 * The wire format is the snapshot shape (MockScript) for easy paste-from-
 * transcript; this type only exists inside the mock provider.
 */
type MockTurn = {
  text?: string
  toolUses?: Array<{
    id: string
    name: string
    input: Record<string, unknown>
  }>
}

function toolUseFromBlock(
  block: Extract<GenericContentBlock, { type: 'tool_use' }>,
) {
  return {
    id: block.id,
    name: block.name,
    input: (block.input ?? {}) as Record<string, unknown>,
  }
}

function normaliseScript(script: MockScript): MockTurn[] {
  return script
    .filter((entry) => entry.type === 'agent')
    .map((entry): MockTurn => {
      if (typeof entry.content === 'string') {
        return { text: entry.content }
      }
      const textParts: string[] = []
      const toolUses: MockTurn['toolUses'] = []
      for (const block of entry.content) {
        if (block.type === 'text' || block.type === 'skill') {
          textParts.push(block.text)
        } else if (block.type === 'tool_use') {
          toolUses.push(toolUseFromBlock(block))
        }
      }
      return {
        text: textParts.length ? textParts.join('') : undefined,
        toolUses: toolUses.length ? toolUses : undefined,
      }
    })
}

/**
 * Build a mock provider that replays a scripted conversation. The mock is
 * stateless across `createStream` calls — the next turn to play is derived
 * from the assistant-message count in `options.messages`, so the standard
 * Session loop drives it naturally.
 *
 * When the script is exhausted (turn index >= number of agent turns in the
 * script), the provider yields a single `message_end { end_turn }` and exits,
 * which terminates the Session loop.
 */
export function createMockProvider(script: MockScript): AIProvider {
  const agentTurns = normaliseScript(script)

  return {
    name: 'mock',
    async *createStream(
      _config: ProviderConfig,
      options: StreamOptions,
    ): AsyncIterable<StreamEvent> {
      const turnIndex = options.messages.filter(
        (m) => m.role === 'assistant',
      ).length
      const turn = agentTurns[turnIndex]

      if (options.signal?.aborted) return

      if (!turn) {
        yield { type: 'message_end', stop_reason: 'end_turn' }
        return
      }

      if (turn.text) {
        if (options.signal?.aborted) return
        yield { type: 'text_start' }
        yield { type: 'text_delta', text: turn.text }
        yield { type: 'text_end' }
      }

      for (const tu of turn.toolUses ?? []) {
        if (options.signal?.aborted) return
        yield { type: 'tool_use_start', id: tu.id, name: tu.name }
        yield {
          type: 'tool_use_delta',
          partial_json: JSON.stringify(tu.input),
        }
        yield { type: 'tool_use_end' }
      }

      if (options.signal?.aborted) return
      yield {
        type: 'message_end',
        stop_reason: turn.toolUses?.length ? 'tool_use' : 'end_turn',
      }
    },
  }
}
