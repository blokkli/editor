import { describe, it, expect } from 'vitest'
import { StreamAccumulator } from './index'

describe('StreamAccumulator', () => {
  it('assembles a text block from multiple deltas', () => {
    const acc = new StreamAccumulator()
    acc.startText()
    expect(acc.pushTextDelta('Hello, ')).toBe('Hello, ')
    expect(acc.pushTextDelta('world')).toBe('world')
    acc.endText()

    expect(acc.blocks).toEqual([{ type: 'text', text: 'Hello, world' }])
  })

  it('applies transformText (ß → ss) to text deltas', () => {
    const acc = new StreamAccumulator()
    acc.startText()
    expect(acc.pushTextDelta('Straße')).toBe('Strasse')
    acc.endText()
    expect(acc.blocks).toEqual([{ type: 'text', text: 'Strasse' }])
  })

  it('ignores text deltas when no text block is open', () => {
    const acc = new StreamAccumulator()
    expect(acc.pushTextDelta('orphan')).toBeNull()
    acc.endText()
    expect(acc.blocks).toEqual([])
  })

  it('does not record an empty text block', () => {
    const acc = new StreamAccumulator()
    acc.startText()
    acc.endText()
    expect(acc.blocks).toEqual([])
  })

  it('finalizes a tool_use with valid JSON input', () => {
    const acc = new StreamAccumulator()
    acc.startToolUse('tu_1', 'add_paragraphs')
    acc.pushToolUseDelta('{"count"')
    acc.pushToolUseDelta(': 3}')
    const finished = acc.finishToolUse()

    expect(finished).toEqual({
      ok: true,
      id: 'tu_1',
      name: 'add_paragraphs',
      input: { count: 3 },
      inputJson: '{"count": 3}',
    })
    // The tool_use block is recorded on the assistant turn.
    expect(acc.blocks).toEqual([
      { type: 'tool_use', id: 'tu_1', name: 'add_paragraphs', input: { count: 3 } },
    ])
  })

  it('treats empty input JSON as an empty object', () => {
    const acc = new StreamAccumulator()
    acc.startToolUse('tu_2', 'get_page_structure')
    const finished = acc.finishToolUse()
    expect(finished).toEqual({
      ok: true,
      id: 'tu_2',
      name: 'get_page_structure',
      input: {},
      inputJson: '',
    })
  })

  it('reports malformed JSON but still records the tool_use block', () => {
    const acc = new StreamAccumulator()
    acc.startToolUse('tu_3', 'set_options')
    acc.pushToolUseDelta('{ not valid json')
    const finished = acc.finishToolUse()

    expect(finished).toEqual({ ok: false, id: 'tu_3', name: 'set_options' })
    // Block recorded with empty input so the assistant message stays valid.
    expect(acc.blocks).toEqual([
      { type: 'tool_use', id: 'tu_3', name: 'set_options', input: {} },
    ])
  })

  it('returns null when finishing with no open tool_use', () => {
    const acc = new StreamAccumulator()
    expect(acc.finishToolUse()).toBeNull()
    expect(acc.blocks).toEqual([])
  })

  it('keeps appending after the block array is reset (early commit)', () => {
    const acc = new StreamAccumulator()
    acc.startText()
    acc.pushTextDelta('first')
    acc.endText()
    expect(acc.blocks.length).toBe(1)

    // Simulate commitMessagesEarly emptying the live array.
    acc.blocks.length = 0
    expect(acc.blocks.length).toBe(0)

    acc.startText()
    acc.pushTextDelta('second')
    acc.endText()
    expect(acc.blocks).toEqual([{ type: 'text', text: 'second' }])
  })

  it('interleaves text and tool_use blocks in order', () => {
    const acc = new StreamAccumulator()
    acc.startText()
    acc.pushTextDelta('let me check')
    acc.endText()
    acc.startToolUse('tu_4', 'find_paragraphs')
    acc.pushToolUseDelta('{}')
    acc.finishToolUse()

    expect(acc.blocks).toEqual([
      { type: 'text', text: 'let me check' },
      { type: 'tool_use', id: 'tu_4', name: 'find_paragraphs', input: {} },
    ])
  })
})
