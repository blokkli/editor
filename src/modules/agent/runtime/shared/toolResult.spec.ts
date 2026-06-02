import { describe, it, expect } from 'vitest'
import { ToolResult } from './toolResult'

/** Compress a wire string and return the parsed compressed payload. */
function compress(content: string, isError?: boolean): unknown {
  return JSON.parse(ToolResult.fromWire(content, isError).compressed().toWire())
}

describe('ToolResult.fromWire + compressed (parity with old compressToolResult)', () => {
  it('uses _summary when present', () => {
    expect(
      compress(JSON.stringify({ _summary: 'found 5 blocks', blocks: [1, 2] })),
    ).toEqual({ summary: 'found 5 blocks' })
  })

  it('prefers _summary over label', () => {
    expect(
      compress(
        JSON.stringify({ _summary: 'custom summary', label: 'a label' }),
      ),
    ).toEqual({ summary: 'custom summary' })
  })

  it('uses label when no _summary', () => {
    expect(compress(JSON.stringify({ label: 'Got 3 blocks' }))).toEqual({
      summary: 'Got 3 blocks',
    })
  })

  it('keeps error', () => {
    expect(compress(JSON.stringify({ error: 'not found' }))).toEqual({
      error: 'not found',
    })
  })

  it('keeps success', () => {
    expect(
      compress(JSON.stringify({ success: true, historyIndex: 5 })),
    ).toEqual({ success: true })
  })

  it('keeps a rejected mutation as success:false', () => {
    expect(
      compress(JSON.stringify({ success: false, rejected: true })),
    ).toEqual({ success: false })
  })

  it('keeps selected', () => {
    expect(compress(JSON.stringify({ selected: 'option-a' }))).toEqual({
      selected: 'option-a',
    })
  })

  it('falls back to completed', () => {
    expect(compress(JSON.stringify({ data: [1, 2, 3] }))).toEqual({
      summary: 'completed',
    })
  })

  it('truncates long non-JSON content', () => {
    const out = ToolResult.fromWire('x'.repeat(200)).compressed().toWire()
    expect(out.length).toBeLessThan(200)
    expect(out).toContain('...')
  })

  it('keeps short non-JSON content as-is', () => {
    expect(ToolResult.fromWire('short text').compressed().toWire()).toBe(
      'short text',
    )
  })

  it('is idempotent — re-compressing keeps the summary', () => {
    const once = ToolResult.fromWire(
      JSON.stringify({ label: 'Found 3 items', data: [1, 2, 3] }),
    ).compressed()
    expect(JSON.parse(once.toWire())).toEqual({ summary: 'Found 3 items' })
    expect(once.compressed().toWire()).toBe(once.toWire())
  })

  it('prefers an explicit summary even for a mutation result', () => {
    // A mutation tool with a prunedSummary attaches _summary; it wins on compress
    // (matching old precedence) but the result is still classified as a mutation.
    const r = ToolResult.fromWire(
      JSON.stringify({ success: true, historyIndex: 1, _summary: 'added 1' }),
    )
    expect(r.isMutationSuccess()).toBe(true)
    expect(JSON.parse(r.compressed().toWire())).toEqual({ summary: 'added 1' })
  })
})

describe('ToolResult.stale (parity with old compressVolatileToolResult)', () => {
  it('marks content stale and keeps the client summary', () => {
    const out = ToolResult.fromWire(
      JSON.stringify({ data: 1, _summary: 'struct' }),
    )
      .stale()
      .toWire()
    expect(JSON.parse(out)).toEqual({ stale: true, summary: 'struct' })
  })

  it('falls back to the default stale message', () => {
    const out = ToolResult.fromWire(JSON.stringify({ data: 1 }))
      .stale()
      .toWire()
    expect(JSON.parse(out)).toEqual({
      stale: true,
      summary: 'page state has changed since this query',
    })
  })

  it('is idempotent — re-running keeps the first summary', () => {
    const once = ToolResult.fromWire(
      JSON.stringify({ data: 1, _summary: 'struct' }),
    ).stale()
    expect(once.stale().toWire()).toBe(once.toWire())
  })

  it('stays stale through compressed()', () => {
    const stale = ToolResult.fromWire(JSON.stringify({ _summary: 's' })).stale()
    expect(stale.compressed().toWire()).toBe(stale.toWire())
  })

  it("preserves an error result verbatim — a failed call isn't stale data", () => {
    const wire = JSON.stringify({ error: 'Invalid input: expected array' })
    const r = ToolResult.fromWire(wire)
    expect(r.stale().toWire()).toBe(wire)
    expect(r.stale().isErrorResult()).toBe(true)
  })
})

describe('ToolResult accessors', () => {
  it('toWire returns the original content verbatim (byte-stable)', () => {
    const content = JSON.stringify({ b: 1, a: 2, nested: { z: [3, 4] } })
    expect(ToolResult.fromWire(content).toWire()).toBe(content)
  })

  it('reports isMutationSuccess only for success:true', () => {
    expect(
      ToolResult.fromWire(
        JSON.stringify({ success: true }),
      ).isMutationSuccess(),
    ).toBe(true)
    expect(
      ToolResult.fromWire(
        JSON.stringify({ success: false }),
      ).isMutationSuccess(),
    ).toBe(false)
    expect(
      ToolResult.fromWire(JSON.stringify({ label: 'x' })).isMutationSuccess(),
    ).toBe(false)
  })

  it('reports isErrorResult for {error} or the is_error flag', () => {
    expect(
      ToolResult.fromWire(JSON.stringify({ error: 'x' })).isErrorResult(),
    ).toBe(true)
    expect(ToolResult.fromWire('plain message', true).isErrorResult()).toBe(
      true,
    )
    expect(
      ToolResult.fromWire(JSON.stringify({ label: 'x' })).isErrorResult(),
    ).toBe(false)
  })

  it('estimates tokens from full content length', () => {
    const content = JSON.stringify({ data: 'x'.repeat(400) })
    expect(ToolResult.fromWire(content).estimatedTokens()).toBeCloseTo(
      content.length / 4,
    )
  })
})

describe('ToolResult.fromClientResult', () => {
  it('rewrites agentMessage to label and serialises like the old path', () => {
    const r = ToolResult.fromClientResult({
      acceptedCount: 2,
      agentMessage: 'rewrote 2 fields',
    })
    // agentMessage becomes label, which wins as the compressed summary.
    expect(JSON.parse(r.compressed().toWire())).toEqual({
      summary: 'rewrote 2 fields',
    })
    // The full wire form carries `label`, not `agentMessage`.
    expect(JSON.parse(r.toWire())).toEqual({
      acceptedCount: 2,
      label: 'rewrote 2 fields',
    })
  })

  it('classifies a plain client result', () => {
    const r = ToolResult.fromClientResult({ success: true, historyIndex: 3 })
    expect(r.isMutationSuccess()).toBe(true)
  })

  it('builds an explicit error', () => {
    const r = ToolResult.error('boom')
    expect(r.isErrorResult()).toBe(true)
    expect(JSON.parse(r.toWire())).toEqual({ error: 'boom' })
  })
})
