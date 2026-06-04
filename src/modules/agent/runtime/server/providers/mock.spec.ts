import { describe, it, expect } from 'vitest'
import { createMockProvider } from './mock'
import type { GenericMessage, MockScript } from '../../shared/types'
import type { StreamEvent, StreamOptions } from './types'

const EMPTY_OPTIONS: Omit<StreamOptions, 'messages'> = {
  systemPrompt: [],
  tools: [],
}

async function collect(
  iter: AsyncIterable<StreamEvent>,
): Promise<StreamEvent[]> {
  const events: StreamEvent[] = []
  for await (const e of iter) events.push(e)
  return events
}

const dummyConfig = { apiKey: '', model: '' }

function runWithHistory(
  script: MockScript,
  messages: GenericMessage[],
  signal?: AbortSignal,
) {
  const provider = createMockProvider(script)
  return collect(
    provider.createStream(dummyConfig, {
      ...EMPTY_OPTIONS,
      messages,
      signal,
    }),
  )
}

describe('createMockProvider', () => {
  it('yields end_turn for an empty script', async () => {
    expect(await runWithHistory([], [])).toEqual([
      { type: 'message_end', stop_reason: 'end_turn' },
    ])
  })

  it('plays a single text-only turn then exhausts cleanly', async () => {
    const script: MockScript = [
      { type: 'user', content: 'hi' },
      { type: 'agent', content: [{ type: 'text', text: 'Hello!' }] },
    ]
    // First call: no assistant in history yet.
    expect(await runWithHistory(script, [])).toEqual([
      { type: 'text_start' },
      { type: 'text_delta', text: 'Hello!' },
      { type: 'text_end' },
      { type: 'message_end', stop_reason: 'end_turn' },
    ])
    // Second call: one assistant in history, script has only one agent turn.
    const exhausted = await runWithHistory(script, [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: [{ type: 'text', text: 'Hello!' }] },
    ])
    expect(exhausted).toEqual([
      { type: 'message_end', stop_reason: 'end_turn' },
    ])
  })

  it('plays a tool-use turn with stop_reason tool_use', async () => {
    const script: MockScript = [
      { type: 'user', content: 'count' },
      {
        type: 'agent',
        content: [
          {
            type: 'tool_use',
            id: 't1',
            name: 'get_page_text',
            input: { foo: 'bar' },
          },
        ],
      },
    ]
    expect(await runWithHistory(script, [])).toEqual([
      { type: 'tool_use_start', id: 't1', name: 'get_page_text' },
      { type: 'tool_use_delta', partial_json: '{"foo":"bar"}' },
      { type: 'tool_use_end' },
      { type: 'message_end', stop_reason: 'tool_use' },
    ])
  })

  it('advances to the next turn after a synthetic tool relay', async () => {
    const script: MockScript = [
      { type: 'user', content: 'do it' },
      {
        type: 'agent',
        content: [{ type: 'tool_use', id: 't1', name: 'run', input: {} }],
      },
      { type: 'agent', content: [{ type: 'text', text: 'Done.' }] },
    ]
    const afterRelay: GenericMessage[] = [
      { role: 'user', content: 'do it' },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 't1', name: 'run', input: {} }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }],
      },
    ]
    expect(await runWithHistory(script, afterRelay)).toEqual([
      { type: 'text_start' },
      { type: 'text_delta', text: 'Done.' },
      { type: 'text_end' },
      { type: 'message_end', stop_reason: 'end_turn' },
    ])
  })

  it('replays a pasted transcript (mixed text + tool use in one turn)', async () => {
    const script: MockScript = [
      { type: 'user', content: 'where is Drupal mentioned?' },
      {
        type: 'agent',
        content: [
          {
            type: 'text',
            text: 'I\'ll search for mentions of "Drupal" on the page.',
          },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'search_text',
            input: { query: 'Drupal', limit: 20 },
          },
        ],
      },
      {
        type: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: '{"matches":[]}',
          },
        ],
      },
      {
        type: 'agent',
        content: [{ type: 'text', text: 'No mentions found.' }],
      },
    ]

    // Turn 1: text + tool_use.
    expect(await runWithHistory(script, [])).toEqual([
      { type: 'text_start' },
      {
        type: 'text_delta',
        text: 'I\'ll search for mentions of "Drupal" on the page.',
      },
      { type: 'text_end' },
      { type: 'tool_use_start', id: 'toolu_1', name: 'search_text' },
      {
        type: 'tool_use_delta',
        partial_json: '{"query":"Drupal","limit":20}',
      },
      { type: 'tool_use_end' },
      { type: 'message_end', stop_reason: 'tool_use' },
    ])

    // Turn 2: after one assistant turn already in history.
    const afterTool: GenericMessage[] = [
      { role: 'user', content: 'where is Drupal mentioned?' },
      {
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'I\'ll search for mentions of "Drupal" on the page.',
          },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'search_text',
            input: { query: 'Drupal', limit: 20 },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: '{"matches":[]}',
          },
        ],
      },
    ]
    expect(await runWithHistory(script, afterTool)).toEqual([
      { type: 'text_start' },
      { type: 'text_delta', text: 'No mentions found.' },
      { type: 'text_end' },
      { type: 'message_end', stop_reason: 'end_turn' },
    ])
  })

  it('exits without yielding when the signal is already aborted', async () => {
    const script: MockScript = [
      { type: 'user', content: 'hi' },
      { type: 'agent', content: [{ type: 'text', text: 'Hello!' }] },
    ]
    const ctrl = new AbortController()
    ctrl.abort()
    expect(await runWithHistory(script, [], ctrl.signal)).toEqual([])
  })
})
