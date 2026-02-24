import { describe, it, expect, vi } from 'vitest'
import type { GenericMessage } from '../../src/modules/agent/runtime/server/providers/types'
import {
  compressToolResult,
  pruneMessages,
  validateMessages,
  findToolNameForResult,
  type ToolPruningMetadata,
} from '../../src/modules/agent/runtime/server/helpers'

// Mock the #blokkli-build/agent-server import used by helpers.ts
vi.mock('#blokkli-build/agent-server', () => ({
  skills: [],
}))

// Mock crossws Peer type
vi.mock('crossws', () => ({}))

// ============================================================================
// compressToolResult
// ============================================================================

describe('compressToolResult', () => {
  it('uses _summary when present', () => {
    const input = JSON.stringify({
      _summary: 'found 5 blocks',
      blocks: [1, 2, 3, 4, 5],
    })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      summary: 'found 5 blocks',
    })
  })

  it('prefers _summary over label', () => {
    const input = JSON.stringify({
      _summary: 'custom summary',
      label: 'a label',
    })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      summary: 'custom summary',
    })
  })

  it('uses label when no _summary', () => {
    const input = JSON.stringify({ label: 'Got 3 blocks' })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      summary: 'Got 3 blocks',
    })
  })

  it('keeps error', () => {
    const input = JSON.stringify({ error: 'not found' })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      error: 'not found',
    })
  })

  it('keeps success', () => {
    const input = JSON.stringify({ success: true, historyIndex: 5 })
    expect(JSON.parse(compressToolResult(input))).toEqual({ success: true })
  })

  it('keeps selected', () => {
    const input = JSON.stringify({ selected: 'option-a' })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      selected: 'option-a',
    })
  })

  it('falls back to completed', () => {
    const input = JSON.stringify({ data: [1, 2, 3] })
    expect(JSON.parse(compressToolResult(input))).toEqual({
      summary: 'completed',
    })
  })

  it('truncates non-JSON content', () => {
    const input = 'x'.repeat(200)
    const result = compressToolResult(input)
    expect(result.length).toBeLessThan(200)
    expect(result).toContain('...')
  })

  it('keeps short non-JSON content as-is', () => {
    const input = 'short text'
    expect(compressToolResult(input)).toBe('short text')
  })
})

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
// pruneMessages
// ============================================================================

describe('pruneMessages', () => {
  function makeUserMsg(text: string): GenericMessage {
    return { role: 'user', content: text }
  }

  function makeAssistantMsg(text: string): GenericMessage {
    return { role: 'assistant', content: [{ type: 'text', text }] }
  }

  function makeToolCallAssistant(
    toolName: string,
    toolId: string,
  ): GenericMessage {
    return {
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: toolId,
          name: toolName,
          input: { some: 'large input data' },
        },
      ],
    }
  }

  function makeToolResultUser(toolId: string, result: unknown): GenericMessage {
    return {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolId,
          content: JSON.stringify(result),
        },
      ],
    }
  }

  it('does not prune when under threshold', () => {
    const messages: GenericMessage[] = [
      makeUserMsg('hello'),
      makeAssistantMsg('hi'),
    ]
    pruneMessages(messages, 2)
    expect(messages).toHaveLength(2)
  })

  it('prunes old tool results', () => {
    const messages: GenericMessage[] = []
    for (let i = 0; i < 3; i++) {
      messages.push(makeUserMsg(`prompt ${i}`))
      messages.push(makeToolCallAssistant('find_blocks', `tu_${i}`))
      messages.push(
        makeToolResultUser(`tu_${i}`, {
          blocks: Array(100).fill({ uuid: 'x', bundle: 'text' }),
          total: 100,
          hasMore: false,
          _summary: 'found 100 blocks',
        }),
      )
    }

    pruneMessages(messages, 1)

    // The first tool result should be compressed
    const firstResult = messages[2]
    expect(Array.isArray(firstResult.content)).toBe(true)
    if (Array.isArray(firstResult.content)) {
      const block = firstResult.content[0]
      if (block && block.type === 'tool_result') {
        const parsed = JSON.parse(block.content)
        expect(parsed.blocks).toBeUndefined()
        expect(parsed.summary).toBeDefined()
      }
    }
  })

  it('Bug 4: counts messages with mixed tool_result and text as tool responses', () => {
    const messages: GenericMessage[] = [
      makeUserMsg('first prompt'),
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu_0', name: 'load_skills', input: {} },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_0',
            content: JSON.stringify({ loaded: true }),
          },
          { type: 'text', text: '# Skill: writing\n\nSome guidelines...' },
        ],
      },
      makeAssistantMsg('done'),
    ]

    // With keepRecentTurns=1, there's only 1 real user turn
    pruneMessages(messages, 1)
    // The text block in the mixed message should still exist (not pruned)
    const mixedMsg = messages[2]
    if (Array.isArray(mixedMsg.content)) {
      const textBlocks = mixedMsg.content.filter((b) => b.type === 'text')
      expect(textBlocks).toHaveLength(1)
    }
  })

  it('compresses tool_use inputs in old assistant messages', () => {
    const messages: GenericMessage[] = []
    for (let i = 0; i < 3; i++) {
      messages.push(makeUserMsg(`prompt ${i}`))
      messages.push(makeToolCallAssistant('add_blocks', `tu_${i}`))
      messages.push(
        makeToolResultUser(`tu_${i}`, { success: true, historyIndex: i }),
      )
    }

    pruneMessages(messages, 1)

    // Check that old assistant tool_use input is pruned
    const oldAssistant = messages[1]
    if (Array.isArray(oldAssistant.content)) {
      const toolUse = oldAssistant.content.find((b) => b.type === 'tool_use')
      if (toolUse && toolUse.type === 'tool_use') {
        expect(toolUse.input).toEqual({ _pruned: true })
      }
    }
  })

  it('marks volatile tool results as stale when mutations happened after', () => {
    const metadata = new Map<string, ToolPruningMetadata>([
      ['get_child_blocks', { volatile: true }],
    ])

    const messages: GenericMessage[] = [
      // Turn 1
      makeUserMsg('show structure'),
      makeToolCallAssistant('get_child_blocks', 'tu_0'),
      makeToolResultUser('tu_0', {
        parentBundle: 'page',
        fields: { content: { blocks: [{ uuid: '1', bundle: 'text' }] } },
        _summary: '1 blocks across 1 fields',
      }),
      // Mutation
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Adding a block' },
          { type: 'tool_use', id: 'tu_1', name: 'add_blocks', input: {} },
        ],
      },
      makeToolResultUser('tu_1', {
        success: true,
        historyIndex: 1,
        _summary: 'added 1 blocks',
      }),
      // Turn 2
      makeUserMsg('what now?'),
      makeAssistantMsg('done'),
    ]

    pruneMessages(messages, 1, metadata)

    // The volatile result should be marked stale
    const volatileResult = messages[2]
    if (Array.isArray(volatileResult.content)) {
      const block = volatileResult.content[0]
      if (block && block.type === 'tool_result') {
        const parsed = JSON.parse(block.content)
        expect(parsed.stale).toBe(true)
        expect(parsed.summary).toBeDefined()
      }
    }
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
