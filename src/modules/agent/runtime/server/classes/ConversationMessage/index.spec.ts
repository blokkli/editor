import { describe, it, expect } from 'vitest'
import type { GenericMessage } from '../../../shared/types'
import { ToolResult } from '../../../shared/toolResult'
import {
  ConversationMessage,
  AssistantMessage,
  ToolRelayMessage,
} from './index'

describe('ConversationMessage.fromWire dispatch', () => {
  it('classifies a plain user prompt', () => {
    const m = ConversationMessage.fromWire({ role: 'user', content: 'hello' })
    expect(m.kind).toBe('userPrompt')
  })

  it('classifies a skill+text user prompt as a prompt (not a relay)', () => {
    const m = ConversationMessage.fromWire({
      role: 'user',
      content: [
        { type: 'skill', name: 'writing', text: '# Skill' },
        { type: 'text', text: 'rewrite' },
      ],
    })
    expect(m.kind).toBe('userPrompt')
  })

  it('classifies a user message with a tool_result as a relay', () => {
    const m = ConversationMessage.fromWire({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tu_0', content: '{}' }],
    })
    expect(m.kind).toBe('toolRelay')
  })

  it('classifies an assistant message', () => {
    const m = ConversationMessage.fromWire({
      role: 'assistant',
      content: [{ type: 'text', text: 'hi' }],
    })
    expect(m.kind).toBe('assistant')
  })
})

describe('toWire round-trips', () => {
  const cases: GenericMessage[] = [
    { role: 'user', content: 'plain prompt' },
    {
      role: 'user',
      content: [
        { type: 'skill', name: 'writing', text: '# Skill' },
        { type: 'text', text: 'rewrite the intro' },
      ],
    },
    {
      role: 'assistant',
      content: [
        { type: 'reasoning', id: 'r0', text: 'thinking', encryptedContent: 'e' },
        { type: 'tool_use', id: 'tu_0', name: 'find', input: { q: 1 } },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'tu_0', content: '{"label":"x"}' },
        { type: 'text', text: 'aux' },
      ],
    },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_1',
          content: '{"error":"boom"}',
          is_error: true,
        },
      ],
    },
  ]

  it.each(cases)('round-trips %#', (msg) => {
    expect(ConversationMessage.fromWire(msg).toWire()).toEqual(msg)
  })
})

describe('AssistantMessage.withPrunedToolUseInputs', () => {
  it('collapses tool_use inputs, leaves reasoning/text intact', () => {
    const a = new AssistantMessage([
      { type: 'reasoning', id: 'r0', text: 'thinking' },
      { type: 'text', text: 'let me check' },
      { type: 'tool_use', id: 'tu_0', name: 'find', input: { q: 'big' } },
    ])
    const wire = a.withPrunedToolUseInputs().toWire()
    const blocks = wire.content as any[]
    expect(blocks[0]).toEqual({ type: 'reasoning', id: 'r0', text: 'thinking' })
    expect(blocks[1]).toEqual({ type: 'text', text: 'let me check' })
    expect(blocks[2].input).toEqual({ _pruned: true })
  })

  it('is pure (original unchanged)', () => {
    const original = new AssistantMessage([
      { type: 'tool_use', id: 'tu_0', name: 'find', input: { q: 1 } },
    ])
    original.withPrunedToolUseInputs()
    expect((original.toWire().content as any[])[0].input).toEqual({ q: 1 })
  })
})

describe('ToolRelayMessage projection', () => {
  function relay(): ToolRelayMessage {
    return new ToolRelayMessage(
      [
        {
          toolUseId: 'tu_0',
          toolName: 'get_structure',
          result: ToolResult.fromWire(
            JSON.stringify({ data: 'x'.repeat(40), _summary: 'structure' }),
          ),
        },
      ],
      [{ type: 'text', text: 'aux text' }],
    )
  }

  it('compresses the body and strips aux when asked', () => {
    const wire = relay()
      .project({ staleToolUseIds: new Set(), compressBody: true, stripAux: true })
      .toWire()
    const blocks = wire.content as any[]
    expect(blocks).toHaveLength(1) // aux stripped
    expect(JSON.parse(blocks[0].content)).toEqual({ summary: 'structure' })
  })

  it('marks a result stale regardless of compressBody', () => {
    const wire = relay()
      .project({
        staleToolUseIds: new Set(['tu_0']),
        compressBody: false,
        stripAux: false,
      })
      .toWire()
    const blocks = wire.content as any[]
    expect(JSON.parse(blocks[0].content)).toEqual({
      stale: true,
      summary: 'structure',
    })
    expect(blocks).toHaveLength(2) // aux kept
  })

  it('leaves everything full when nothing is requested', () => {
    const r = relay()
    expect(
      r
        .project({
          staleToolUseIds: new Set(),
          compressBody: false,
          stripAux: false,
        })
        .toWire(),
    ).toEqual(r.toWire())
  })

  it('replaceResult swaps one result immutably', () => {
    const r = relay()
    const swapped = r.replaceResult('tu_0', ToolResult.error('rejected'))
    expect(JSON.parse((swapped.toWire().content as any[])[0].content)).toEqual({
      error: 'rejected',
    })
    // original unchanged
    expect(
      JSON.parse((r.toWire().content as any[])[0].content)._summary,
    ).toBe('structure')
  })

  it('withResolvedNames fills missing tool names', () => {
    const r = ToolRelayMessage.fromWire({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tu_0', content: '{}' }],
    })
    expect(r.entries[0].toolName).toBeUndefined()
    const resolved = r.withResolvedNames((id) =>
      id === 'tu_0' ? 'find' : undefined,
    )
    expect(resolved.entries[0].toolName).toBe('find')
  })

  it('estimatedTokens sums full result sizes', () => {
    const content = JSON.stringify({ data: 'x'.repeat(400) })
    const r = new ToolRelayMessage([
      { toolUseId: 'tu_0', toolName: 'find', result: ToolResult.fromWire(content) },
    ])
    expect(r.estimatedTokens()).toBeCloseTo(content.length / 4)
  })
})
