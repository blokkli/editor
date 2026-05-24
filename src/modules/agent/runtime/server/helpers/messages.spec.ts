import { describe, it, expect } from 'vitest'
import type { GenericMessage } from '../../shared/types'
import { validateMessages } from './messages'

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
