import { describe, it, expect } from 'vitest'
import type { GenericMessage } from '../../../shared/types'
import { validateMessages } from '../../helpers/messages'
import { ConversationHistory } from './index'

// ---------------------------------------------------------------------------
// Wire-format fixture builders (mirror the real message shapes)
// ---------------------------------------------------------------------------

function userPrompt(text: string): GenericMessage {
  return { role: 'user', content: text }
}

function toolAssistant(name: string, id: string): GenericMessage {
  return {
    role: 'assistant',
    content: [{ type: 'tool_use', id, name, input: { some: 'input' } }],
  }
}

/** A tool-result relay whose JSON content is ~`tokens` tokens (≈ tokens*4 chars). */
function relay(id: string, tokens: number, summary: string): GenericMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: id,
        content: JSON.stringify({
          data: 'x'.repeat(tokens * 4),
          _summary: summary,
        }),
      },
    ],
  }
}

function mutationRelay(id: string, summary: string): GenericMessage {
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: id,
        content: JSON.stringify({ success: true, _summary: summary }),
      },
    ],
  }
}

/** Build a history from a wire array via the restore path. */
function history(wire: GenericMessage[]): ConversationHistory {
  const h = new ConversationHistory()
  h.replaceAll(wire)
  return h
}

const noVolatile = () => false

function parseResult(msg: GenericMessage, blockIndex = 0): any {
  if (!Array.isArray(msg.content)) throw new Error('expected array content')
  const block = msg.content[blockIndex]
  if (!block || block.type !== 'tool_result')
    throw new Error('expected tool_result')
  return JSON.parse(block.content)
}

// ---------------------------------------------------------------------------

describe('projectForLlm — purity & determinism', () => {
  const wire: GenericMessage[] = [
    userPrompt('go'),
    toolAssistant('find', 'tu_0'),
    relay('tu_0', 30, 's0'),
    toolAssistant('find', 'tu_1'),
    relay('tu_1', 30, 's1'),
    toolAssistant('find', 'tu_2'),
    relay('tu_2', 30, 's2'),
  ]

  it('is deterministic — two projections are byte-identical', () => {
    const h = history(wire)
    const a = JSON.stringify(h.projectForLlm(noVolatile, { tokenBudget: 80 }))
    const b = JSON.stringify(h.projectForLlm(noVolatile, { tokenBudget: 80 }))
    expect(a).toBe(b)
  })

  it('never mutates canonical (full view stable across projections)', () => {
    const h = history(wire)
    const before = JSON.stringify(h.toWireAll())
    h.projectForLlm(noVolatile, { tokenBudget: 80 })
    h.projectForLlm(noVolatile, { tokenBudget: 10 })
    expect(JSON.stringify(h.toWireAll())).toBe(before)
  })

  it('keeps the projection 1:1 with canonical and structurally valid', () => {
    const h = history(wire)
    const projected = h.projectForLlm(noVolatile, { tokenBudget: 80 })
    expect(projected).toHaveLength(h.length)
    expect(validateMessages(projected)).toEqual([])
  })

  it('keeps a compressed prefix byte-stable as history grows (cache safety)', () => {
    const shorter = history(wire)
    const longer = history([
      ...wire,
      toolAssistant('find', 'tu_3'),
      relay('tu_3', 30, 's3'),
    ])
    const p1 = shorter.projectForLlm(noVolatile, { tokenBudget: 80 })
    const p2 = longer.projectForLlm(noVolatile, { tokenBudget: 80 })
    // The oldest relay (index 2) is compressed in both; its bytes must match.
    expect(JSON.stringify(p2[2])).toBe(JSON.stringify(p1[2]))
  })
})

describe('projectForLlm — token-budget recency', () => {
  const wire: GenericMessage[] = [
    userPrompt('go'),
    toolAssistant('find', 'tu_0'),
    relay('tu_0', 30, 's0'),
    toolAssistant('find', 'tu_1'),
    relay('tu_1', 30, 's1'),
    toolAssistant('find', 'tu_2'),
    relay('tu_2', 30, 's2'),
  ]

  it('keeps the newest relay full even when it alone exceeds the budget', () => {
    const h = history([
      userPrompt('go'),
      toolAssistant('find', 'tu_0'),
      relay('tu_0', 500, 'big'),
    ])
    const p = h.projectForLlm(noVolatile, { tokenBudget: 10 })
    expect(parseResult(p[2]).data).toHaveLength(2000)
  })

  it('compresses older results once cumulative size exceeds the budget', () => {
    const p = history(wire).projectForLlm(noVolatile, { tokenBudget: 80 })
    expect(parseResult(p[2]).data).toBeUndefined()
    expect(parseResult(p[2]).summary).toBe('s0')
    expect(parseResult(p[4]).data).toBeDefined()
    expect(parseResult(p[6]).data).toBeDefined()
  })

  it('prunes tool_use inputs only for compressed (older) rounds', () => {
    const p = history(wire).projectForLlm(noVolatile, { tokenBudget: 80 })
    const oldAsst = p[1]
    const keptAsst = p[3]
    if (Array.isArray(oldAsst.content) && oldAsst.content[0].type === 'tool_use')
      expect(oldAsst.content[0].input).toEqual({ _pruned: true })
    if (
      Array.isArray(keptAsst.content) &&
      keptAsst.content[0].type === 'tool_use'
    )
      expect(keptAsst.content[0].input).toEqual({ some: 'input' })
  })

  it('never strips a genuine user prompt or empties its content array', () => {
    const h = history([
      {
        role: 'user',
        content: [
          { type: 'skill', name: 'writing', text: '# Skill: writing' },
          { type: 'text', text: 'rewrite the intro' },
        ],
      },
      toolAssistant('find', 'tu_0'),
      relay('tu_0', 100, 's0'),
      toolAssistant('find', 'tu_1'),
      relay('tu_1', 100, 's1'),
    ])
    const first = h.projectForLlm(noVolatile, { tokenBudget: 50 })[0]
    expect(Array.isArray(first.content) && first.content.length).toBeGreaterThan(0)
    if (Array.isArray(first.content)) {
      const text = first.content.find((b) => b.type === 'text')
      expect(text && text.type === 'text' && text.text).toBe('rewrite the intro')
    }
  })

  it('leaves reasoning blocks untouched while pruning tool_use inputs', () => {
    const h = history([
      userPrompt('go'),
      {
        role: 'assistant',
        content: [
          { type: 'reasoning', id: 'r0', text: 'thinking', encryptedContent: 'e' },
          { type: 'tool_use', id: 'tu_0', name: 'find', input: { q: 1 } },
        ],
      },
      relay('tu_0', 100, 's0'),
      toolAssistant('find', 'tu_1'),
      relay('tu_1', 100, 's1'),
    ])
    const asst = h.projectForLlm(noVolatile, { tokenBudget: 50 })[1]
    if (Array.isArray(asst.content)) {
      const reasoning = asst.content.find((b) => b.type === 'reasoning')
      expect(reasoning && reasoning.type === 'reasoning' && reasoning.text).toBe(
        'thinking',
      )
      const toolUse = asst.content.find((b) => b.type === 'tool_use')
      expect(toolUse && toolUse.type === 'tool_use' && toolUse.input).toEqual({
        _pruned: true,
      })
    }
  })
})

describe('projectForLlm — volatile staleness', () => {
  const isStructure = (name: string | undefined) => name === 'get_structure'

  it('marks a volatile result stale once a mutation follows it', () => {
    const h = history([
      userPrompt('show'),
      toolAssistant('get_structure', 'tu_0'),
      relay('tu_0', 20, 'structure'),
      toolAssistant('add_blocks', 'tu_1'),
      mutationRelay('tu_1', 'added'),
    ])
    const p = h.projectForLlm(isStructure)
    expect(parseResult(p[2]).stale).toBe(true)
    expect(parseResult(p[2]).summary).toBe('structure')
  })

  it('does NOT mark a volatile result stale when no mutation follows', () => {
    const h = history([
      userPrompt('show'),
      toolAssistant('get_structure', 'tu_0'),
      relay('tu_0', 20, 'structure'),
    ])
    const p = h.projectForLlm(isStructure)
    expect(parseResult(p[2]).stale).toBeUndefined()
    expect(parseResult(p[2]).data).toBeDefined()
  })

  it('treats a stale result as small in the budget walk (keeps older real result)', () => {
    const h = history([
      userPrompt('go'),
      toolAssistant('find', 'tu_0'),
      relay('tu_0', 50, 'realA'),
      toolAssistant('get_structure', 'tu_1'),
      relay('tu_1', 1000, 'bigvol'),
      toolAssistant('add_blocks', 'tu_2'),
      mutationRelay('tu_2', 'added'),
    ])
    const p = h.projectForLlm(isStructure, { tokenBudget: 200 })
    expect(parseResult(p[4]).stale).toBe(true)
    expect(parseResult(p[2]).data).toBeDefined()
  })
})

describe('projectForLlm — age ceiling', () => {
  it('compresses tool results from turns older than keepRecentTurns', () => {
    const wire: GenericMessage[] = []
    for (let i = 0; i < 3; i++) {
      wire.push(userPrompt(`prompt ${i}`))
      wire.push(toolAssistant('find', `tu_${i}`))
      wire.push(relay(`tu_${i}`, 5, `s${i}`))
    }
    const p = history(wire).projectForLlm(noVolatile, {
      keepRecentTurns: 1,
      tokenBudget: 100000,
    })
    // First turn's relay (index 2) compressed by the age ceiling despite budget.
    expect(parseResult(p[2]).data).toBeUndefined()
    expect(parseResult(p[2]).summary).toBe('s0')
  })
})

describe('rollback — truncateAtUserTurn', () => {
  it('truncates at the Nth real user turn (skill+text prompt counts)', () => {
    const h = history([
      {
        role: 'user',
        content: [
          { type: 'skill', name: 'writing', text: '# Skill' },
          { type: 'text', text: 'first prompt' },
        ],
      },
      { role: 'assistant', content: [{ type: 'text', text: 'a' }] },
      userPrompt('second prompt'),
      { role: 'assistant', content: [{ type: 'text', text: 'b' }] },
    ])
    expect(h.countUserTurns()).toBe(2)
    h.truncateAtUserTurn(1) // drop from the 2nd prompt onward
    expect(h.length).toBe(2)
    expect(h.countUserTurns()).toBe(1)
  })

  it('throws when the index is out of range', () => {
    const h = history([userPrompt('only one')])
    expect(() => h.truncateAtUserTurn(3)).toThrow(/out of range/)
  })
})

describe('projectForPersistence', () => {
  it('keeps the user prompt text in an aged-out skill+text message', () => {
    const h = history([
      {
        role: 'user',
        content: [
          { type: 'skill', name: 'writing', text: '# Skill: writing...' },
          { type: 'text', text: 'rewrite the intro' },
        ],
      },
      { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
      userPrompt('next prompt'),
      { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
    ])
    const pruned = h.projectForPersistence({ keepTurns: 2 })
    expect(validateMessages(pruned)).toEqual([])
    const first = pruned[0]
    if (Array.isArray(first.content)) {
      expect(first.content.filter((b) => b.type === 'text')).toHaveLength(1)
    }
  })

  it('compresses tool_result blocks and strips their auxiliary text', () => {
    const h = history([
      userPrompt('first prompt'),
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
      userPrompt('second prompt'),
      { role: 'assistant', content: [{ type: 'text', text: 'reply' }] },
    ])
    const pruned = h.projectForPersistence({ keepTurns: 2 })
    const toolMsg = pruned[2]
    if (Array.isArray(toolMsg.content)) {
      expect(toolMsg.content.filter((b) => b.type === 'text')).toHaveLength(0)
      const resultBlock = toolMsg.content.find((b) => b.type === 'tool_result')
      if (resultBlock && resultBlock.type === 'tool_result') {
        expect(JSON.parse(resultBlock.content)).toEqual({ summary: 'found 3' })
      }
    }
  })

  it('is stable across a persist → restore → persist round-trip', () => {
    const wire: GenericMessage[] = [
      userPrompt('go'),
      toolAssistant('find', 'tu_0'),
      relay('tu_0', 30, 's0'),
      { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
      userPrompt('again'),
      toolAssistant('find', 'tu_1'),
      relay('tu_1', 30, 's1'),
    ]
    const once = history(wire).projectForPersistence()
    const twice = history(once).projectForPersistence()
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
    expect(validateMessages(once)).toEqual([])
  })
})

describe('buildTranscriptMessages', () => {
  it('includes `full` only when the seen (compressed) form differs', () => {
    const h = history([
      userPrompt('go'),
      toolAssistant('find', 'tu_0'),
      relay('tu_0', 200, 's0'),
      toolAssistant('find', 'tu_1'),
      relay('tu_1', 5, 's1'),
    ])
    const rows = h.buildTranscriptMessages(noVolatile, { tokenBudget: 20 })
    // Oldest relay (index 2) is compressed → has a differing full form.
    expect(rows[2].full).toBeDefined()
    // The user prompt is never compressed → no full form.
    expect(rows[0].full).toBeUndefined()
    expect(rows).toHaveLength(h.length)
  })
})
