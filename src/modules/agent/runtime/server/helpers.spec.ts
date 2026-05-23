import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import type { GenericMessage } from './providers/types'
import type {
  AgentModelDefinition,
  ConversationStateSnapshot,
} from '../shared/types'
import {
  compressToolResult,
  pruneMessages,
  pruneForPersistence,
  validateMessages,
  findToolNameForResult,
  computeStateHash,
  verifyStateHash,
  getDefaultModel,
  createUsageTurn,
  validateToken,
  countUserTurns,
  compressUserMessageContent,
  type ToolPruningMetadata,
} from './helpers'

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

  it('Bug 2: is idempotent — re-compressing keeps the summary', () => {
    // pruneMessages mutates messages in place every turn, so an already-
    // compressed result is fed back through compressToolResult on later turns.
    // It must not degrade to the generic { summary: 'completed' } fallback.
    const once = compressToolResult(
      JSON.stringify({ label: 'Found 3 items', data: [1, 2, 3] }),
    )
    expect(JSON.parse(once)).toEqual({ summary: 'Found 3 items' })

    const twice = compressToolResult(once)
    expect(JSON.parse(twice)).toEqual({ summary: 'Found 3 items' })
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

  it('does not empty user prompts that contain only skill+text blocks', () => {
    // First user message with auto-loaded skills is built as an array
    // [skill, text]. When this turn ages out it must NOT become an empty
    // content array — Anthropic rejects messages.0 with empty content.
    const messages: GenericMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'skill', name: 'writing', text: '# Skill: writing...' },
          { type: 'text', text: 'rewrite the intro' },
        ],
      },
      makeAssistantMsg('done'),
      makeUserMsg('next prompt'),
      makeAssistantMsg('reply'),
    ]

    pruneMessages(messages, 1)

    const first = messages[0]
    expect(Array.isArray(first.content)).toBe(true)
    if (Array.isArray(first.content)) {
      expect(first.content.length).toBeGreaterThan(0)
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

// ============================================================================
// pruneForPersistence
// ============================================================================

describe('pruneForPersistence', () => {
  it('Bug 4: keeps the user prompt text in an aged-out skill+text message', () => {
    // The first user message with auto-loaded skills is built as [skill, text].
    // When it ages out (but is still retained), pruneForPersistence must not
    // strip its text block — that text IS the user's prompt, and stripping it
    // loses content (and would empty a text-only array, which restore rejects).
    const messages: GenericMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'skill', name: 'writing', text: '# Skill: writing...' },
          { type: 'text', text: 'rewrite the intro' },
        ],
      },
      { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
      { role: 'user', content: 'next prompt' },
      { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
    ]

    const pruned = pruneForPersistence(messages, 2)

    expect(validateMessages(pruned)).toEqual([])
    const first = pruned[0]
    expect(Array.isArray(first.content)).toBe(true)
    if (Array.isArray(first.content)) {
      const textBlocks = first.content.filter((b) => b.type === 'text')
      expect(textBlocks).toHaveLength(1)
    }
  })

  it('still compresses tool_result blocks and strips their auxiliary text', () => {
    const messages: GenericMessage[] = [
      { role: 'user', content: 'first prompt' },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_0', name: 'find_blocks', input: {} }],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_0',
            content: JSON.stringify({ label: 'found 3', data: [1, 2, 3] }),
          },
          { type: 'text', text: 'auxiliary text' },
        ],
      },
      { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
      { role: 'user', content: 'second prompt' },
      { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
    ]

    const pruned = pruneForPersistence(messages, 2)

    const toolMsg = pruned[2]
    expect(Array.isArray(toolMsg.content)).toBe(true)
    if (Array.isArray(toolMsg.content)) {
      // tool_result compressed to its summary, auxiliary text stripped.
      const textBlocks = toolMsg.content.filter((b) => b.type === 'text')
      expect(textBlocks).toHaveLength(0)
      const resultBlock = toolMsg.content.find((b) => b.type === 'tool_result')
      expect(resultBlock && resultBlock.type === 'tool_result').toBe(true)
      if (resultBlock && resultBlock.type === 'tool_result') {
        expect(JSON.parse(resultBlock.content)).toEqual({ summary: 'found 3' })
      }
    }
  })
})

// ============================================================================
// computeStateHash / verifyStateHash
// ============================================================================

describe('verifyStateHash', () => {
  function snapshot(secret: string): ConversationStateSnapshot {
    const messages: GenericMessage[] = [{ role: 'user', content: 'hi' }]
    const activatedLazyTools: string[] = ['some_tool']
    return {
      messages,
      activatedLazyTools,
      hash: computeStateHash(messages, activatedLazyTools, secret),
    }
  }

  it('verifies a snapshot hashed with the same non-empty secret', () => {
    expect(verifyStateHash(snapshot('s3cr3t'), 's3cr3t')).toBe(true)
  })

  it('rejects a snapshot hashed with a different secret', () => {
    expect(verifyStateHash(snapshot('s3cr3t'), 'other')).toBe(false)
  })

  it('Bug 3: rejects when the secret is empty even if hashes match', () => {
    // authSecret defaults to '' when unconfigured. The token path guards this,
    // but the state-hash path must too — otherwise forged state verifies.
    expect(verifyStateHash(snapshot(''), '')).toBe(false)
  })
})

// ============================================================================
// getDefaultModel
// ============================================================================

describe('getDefaultModel', () => {
  const model = (
    name: string,
    extra: Partial<AgentModelDefinition> = {},
  ): AgentModelDefinition => ({ name, label: name, ...extra })

  it('returns the model flagged isDefault', () => {
    const models = [model('a'), model('b', { isDefault: true }), model('c')]
    expect(getDefaultModel(models)?.name).toBe('b')
  })

  it('falls back to the first model when none is flagged', () => {
    const models = [model('a'), model('b')]
    expect(getDefaultModel(models)?.name).toBe('a')
  })

  it('returns undefined for an empty list', () => {
    expect(getDefaultModel([])).toBeUndefined()
  })
})

// ============================================================================
// createUsageTurn
// ============================================================================

describe('createUsageTurn', () => {
  const pricing = { input: 1, cacheWrite: 2, cacheRead: 3, output: 4 }
  const model: AgentModelDefinition = { name: 'm', label: 'm', pricing }

  it('builds a usage turn, defaulting cache fields and pricing', () => {
    expect(createUsageTurn({ inputTokens: 10, outputTokens: 5 }, model)).toEqual(
      {
        inputTokens: 10,
        outputTokens: 5,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        pricing,
      },
    )
  })

  it('passes through cache fields and null pricing when no model', () => {
    expect(
      createUsageTurn(
        {
          inputTokens: 10,
          outputTokens: 5,
          cacheCreationInputTokens: 2,
          cacheReadInputTokens: 7,
        },
        undefined,
      ),
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      cacheCreationInputTokens: 2,
      cacheReadInputTokens: 7,
      pricing: null,
    })
  })

  it('returns undefined when token counts are missing', () => {
    expect(createUsageTurn({ outputTokens: 5 }, model)).toBeUndefined()
    expect(createUsageTurn({ inputTokens: 10 }, model)).toBeUndefined()
  })
})

// ============================================================================
// validateToken
// ============================================================================

describe('validateToken', () => {
  const SECRET = 's3cr3t'

  function makeToken(timestamp: number, secret = SECRET): string {
    const hmac = createHmac('sha256', secret).update(String(timestamp)).digest('hex')
    return `${timestamp}:${hmac}`
  }

  it('accepts a fresh, correctly-signed token', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now), SECRET)).toBe(true)
  })

  it('rejects an expired token', () => {
    const stale = Math.floor(Date.now() / 1000) - 301
    expect(validateToken(makeToken(stale), SECRET)).toBe(false)
  })

  it('rejects a token signed with a different secret', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now, 'other'), SECRET)).toBe(false)
  })

  it('rejects an empty secret, empty token, or malformed token', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(validateToken(makeToken(now), '')).toBe(false)
    expect(validateToken('', SECRET)).toBe(false)
    expect(validateToken('no-colon', SECRET)).toBe(false)
    expect(validateToken('notanumber:abcd', SECRET)).toBe(false)
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
// compressUserMessageContent
// ============================================================================

describe('compressUserMessageContent', () => {
  it('compresses tool_result blocks to their summary', () => {
    const content: GenericMessage['content'] = [
      {
        type: 'tool_result',
        tool_use_id: 'tu_0',
        content: JSON.stringify({
          blocks: Array(50).fill({ uuid: 'x' }),
          _summary: 'found 50 blocks',
        }),
      },
    ]
    const messages: GenericMessage[] = [{ role: 'user', content }]

    compressUserMessageContent(content as never, messages, 0, new Map(), {
      volatileCheck: false,
      stripAux: false,
    })

    const block = (content as never[])[0] as {
      type: string
      content: string
    }
    const parsed = JSON.parse(block.content)
    expect(parsed.blocks).toBeUndefined()
    expect(parsed.summary).toBe('found 50 blocks')
  })

  it('strips aux text/skill blocks only when stripAux is true', () => {
    const build = () =>
      [
        { type: 'skill', name: 'writing', text: '# Skill' },
        { type: 'text', text: 'aux text' },
        { type: 'tool_result', tool_use_id: 'tu_0', content: '{}' },
      ] as never[]

    const kept = build()
    compressUserMessageContent(
      kept,
      [{ role: 'user', content: kept as never }],
      0,
      new Map(),
      { volatileCheck: false, stripAux: false },
    )
    // No stripping: skill + text + tool_result all retained.
    expect(kept.length).toBe(3)

    const stripped = build()
    compressUserMessageContent(
      stripped,
      [{ role: 'user', content: stripped as never }],
      0,
      new Map(),
      { volatileCheck: false, stripAux: true },
    )
    // Aux blocks removed, tool_result kept.
    expect(stripped.length).toBe(1)
    expect((stripped[0] as { type: string }).type).toBe('tool_result')
  })

  it('marks volatile query results stale when a mutation follows', () => {
    const volatileResult = {
      type: 'tool_result' as const,
      tool_use_id: 'tu_query',
      content: JSON.stringify({ _summary: 'queried blocks' }),
    }
    const messages: GenericMessage[] = [
      { role: 'user', content: 'prompt' },
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu_query', name: 'find_blocks', input: {} },
        ],
      },
      { role: 'user', content: [volatileResult] },
      // A later mutation result makes the earlier query stale.
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'tu_mut', name: 'add_paragraphs', input: {} },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tu_mut',
            content: JSON.stringify({ success: true }),
          },
        ],
      },
    ]
    const metadata = new Map<string, ToolPruningMetadata>([
      ['find_blocks', { volatile: true }],
    ])

    const content = messages[2].content as never[]
    compressUserMessageContent(content, messages, 2, metadata, {
      volatileCheck: true,
      stripAux: true,
    })

    const parsed = JSON.parse((content[0] as { content: string }).content)
    expect(parsed.stale).toBe(true)
  })
})
