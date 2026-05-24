import { describe, it, expect } from 'vitest'
import type { GenericMessage } from '../../shared/types'
import {
  findToolNameForResult,
  countUserTurns,
  validateMessages,
} from './messages'

// ============================================================================
// findToolNameForResult
// ============================================================================

describe('findToolNameForResult', () => {
  it('finds tool name from preceding assistant message', () => {
    const messages: GenericMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'get_child_blocks',
            input: {},
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_1',
            content: '{}',
          },
        ],
      },
    ]
    expect(findToolNameForResult(messages, 1, 'tu_1')).toBe('get_child_blocks')
  })

  it('returns undefined for unknown tool_use_id', () => {
    const messages: GenericMessage[] = [
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'find_blocks', input: {} },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_999',
            content: '{}',
          },
        ],
      },
    ]
    expect(findToolNameForResult(messages, 1, 'tu_999')).toBeUndefined()
  })
})

// ============================================================================
// countUserTurns
// ============================================================================

describe('countUserTurns', () => {
  it('counts only user messages without tool_result blocks as turns', () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'prompt one' },
      { role: 'assistant', content: 'reply one' },
      // A tool-response user message is NOT a turn.
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'tu_0', content: '{}' },
        ],
      },
      { role: 'user', content: 'prompt two' },
      { role: 'assistant', content: 'reply two' },
    ]

    const { turnCount, turnStartIndices } = countUserTurns(messages)
    expect(turnCount).toBe(2)
    expect(turnStartIndices).toEqual([0, 3])
  })

  it('returns zero turns for an empty array', () => {
    expect(countUserTurns([])).toEqual({ turnCount: 0, turnStartIndices: [] })
  })
})

// ============================================================================
// validateMessages
// ============================================================================

describe('validateMessages', () => {
  it('returns empty array for valid messages', () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'hello' },
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'hi' }],
      },
    ]
    expect(validateMessages(messages)).toEqual([])
  })

  it('detects consecutive same-role messages', () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'hello' },
      { role: 'user', content: 'again' },
    ]
    const issues = validateMessages(messages)
    expect(issues).toHaveLength(1)
    expect(issues[0]).toContain('Consecutive user')
  })

  it('detects empty content arrays', () => {
    const messages: GenericMessage[] = [{ role: 'assistant', content: [] }]
    const issues = validateMessages(messages)
    expect(issues.some((i) => i.includes('Empty content'))).toBe(true)
  })

  it('detects orphaned tool_result', () => {
    const messages: GenericMessage[] = [
      { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'missing_id',
            content: '{}',
          },
        ],
      },
    ]
    const issues = validateMessages(messages)
    expect(issues.some((i) => i.includes('Orphaned tool_result'))).toBe(true)
  })

  it('detects orphaned tool_use without following tool_result', () => {
    const messages: GenericMessage[] = [
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'find_blocks',
            input: {},
          },
        ],
      },
      { role: 'user', content: 'hello' },
    ]
    const issues = validateMessages(messages)
    expect(issues.some((i) => i.includes('no matching tool_result'))).toBe(true)
  })

  it('passes valid tool_use/tool_result pairs', () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'test' },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'find_blocks',
            input: {},
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_1',
            content: '{}',
          },
        ],
      },
    ]
    expect(validateMessages(messages)).toEqual([])
  })
})
