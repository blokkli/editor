import { describe, it, expect } from 'vitest'
import { FieldStreamParser, type ParserEvent } from './streamParser'

describe('FieldStreamParser', () => {
  it('parses a single field with [[[FULL]]]', () => {
    const parser = new FieldStreamParser()
    const events = parser.feed('[[[FIELD:0]]]\n[[[FULL]]]\n<p>Hello world</p>')
    const flushEvents = parser.flush()
    const allEvents = [...events, ...flushEvents]

    // Should have field_start, one or more full_delta, and field_end.
    expect(allEvents[0]).toEqual({
      type: 'field_start',
      index: 0,
      mode: 'full',
    })
    expect(allEvents[allEvents.length - 1]).toEqual({
      type: 'field_end',
      index: 0,
    })

    const deltas = allEvents.filter((e) => e.type === 'full_delta')
    expect(deltas.length).toBeGreaterThanOrEqual(1)
    // Last delta should have the full accumulated value.
    expect(deltas[deltas.length - 1]).toMatchObject({
      value: '<p>Hello world</p>',
    })
  })

  it('parses a single field with one SEARCH/REPLACE pair', () => {
    const parser = new FieldStreamParser()
    const events = parser.feed(
      '[[[FIELD:0]]]\n[[[SEARCH]]]\nmispelled\n[[[REPLACE]]]\nmisspelled',
    )
    const flushEvents = parser.flush()
    const allEvents = [...events, ...flushEvents]

    expect(allEvents).toEqual([
      { type: 'field_start', index: 0, mode: 'patch' },
      {
        type: 'replace_delta',
        index: 0,
        search: 'mispelled',
        value: 'misspelled',
      },
      {
        type: 'operation_end',
        index: 0,
        search: 'mispelled',
        replace: 'misspelled',
      },
      { type: 'field_end', index: 0 },
    ])
  })

  it('parses multiple SEARCH/REPLACE pairs in one field', () => {
    const parser = new FieldStreamParser()
    const input = [
      '[[[FIELD:0]]]',
      '[[[SEARCH]]]',
      'mispelled',
      '[[[REPLACE]]]',
      'misspelled',
      '[[[SEARCH]]]',
      'teh',
      '[[[REPLACE]]]',
      'the',
    ].join('\n')

    const events = [...parser.feed(input), ...parser.flush()]

    const operations = events.filter((e) => e.type === 'operation_end')
    expect(operations).toHaveLength(2)
    expect(operations[0]).toEqual({
      type: 'operation_end',
      index: 0,
      search: 'mispelled',
      replace: 'misspelled',
    })
    expect(operations[1]).toEqual({
      type: 'operation_end',
      index: 0,
      search: 'teh',
      replace: 'the',
    })
  })

  it('parses mixed fields (some full, some patch)', () => {
    const parser = new FieldStreamParser()
    const input = [
      '[[[FIELD:0]]]',
      '[[[SEARCH]]]',
      'typo',
      '[[[REPLACE]]]',
      'fixed',
      '[[[FIELD:1]]]',
      '[[[FULL]]]',
      'Entirely new translated text',
    ].join('\n')

    const events = [...parser.feed(input), ...parser.flush()]

    const starts = events.filter((e) => e.type === 'field_start') as Array<{
      type: 'field_start'
      index: number
      mode: string
    }>
    expect(starts).toHaveLength(2)
    expect(starts[0]).toEqual({ type: 'field_start', index: 0, mode: 'patch' })
    expect(starts[1]).toEqual({ type: 'field_start', index: 1, mode: 'full' })

    const ends = events.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(2)
  })

  it('handles skipped field indices', () => {
    const parser = new FieldStreamParser()
    const input = [
      '[[[FIELD:0]]]',
      '[[[FULL]]]',
      'First field',
      '[[[FIELD:3]]]',
      '[[[FULL]]]',
      'Fourth field',
    ].join('\n')

    const events = [...parser.feed(input), ...parser.flush()]

    const starts = events.filter((e) => e.type === 'field_start') as Array<{
      type: 'field_start'
      index: number
      mode: string
    }>
    expect(starts).toHaveLength(2)
    expect(starts[0]).toMatchObject({ index: 0 })
    expect(starts[1]).toMatchObject({ index: 3 })
  })

  it('handles character-by-character streaming', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []
    const input = '[[[FIELD:0]]]\n[[[SEARCH]]]\nold\n[[[REPLACE]]]\nnew'

    for (const char of input) {
      allEvents.push(...parser.feed(char))
    }
    allEvents.push(...parser.flush())

    const operations = allEvents.filter((e) => e.type === 'operation_end')
    expect(operations).toHaveLength(1)
    expect(operations[0]).toEqual({
      type: 'operation_end',
      index: 0,
      search: 'old',
      replace: 'new',
    })

    const starts = allEvents.filter((e) => e.type === 'field_start')
    expect(starts).toHaveLength(1)

    const ends = allEvents.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(1)
  })

  it('handles character-by-character streaming with FULL mode', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []
    const input = '[[[FIELD:0]]]\n[[[FULL]]]\nHello world'

    for (const char of input) {
      allEvents.push(...parser.feed(char))
    }
    allEvents.push(...parser.flush())

    const deltas = allEvents.filter((e) => e.type === 'full_delta')
    expect(deltas.length).toBeGreaterThanOrEqual(1)

    // Last delta should have the full accumulated value.
    const lastDelta = deltas[deltas.length - 1] as { value: string }
    expect(lastDelta.value).toBe('Hello world')

    const ends = allEvents.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(1)
  })

  it('emits replace_delta events during streaming', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []

    allEvents.push(
      ...parser.feed('[[[FIELD:0]]]\n[[[SEARCH]]]\nold word\n[[[REPLACE]]]\n'),
    )
    allEvents.push(...parser.feed('new'))
    allEvents.push(...parser.feed(' word'))
    allEvents.push(...parser.flush())

    const deltas = allEvents.filter((e) => e.type === 'replace_delta')
    expect(deltas.length).toBeGreaterThanOrEqual(1)

    // Deltas accumulate.
    for (let i = 1; i < deltas.length; i++) {
      expect(
        (deltas[i] as { value: string }).value.length,
      ).toBeGreaterThanOrEqual(
        (deltas[i - 1] as { value: string }).value.length,
      )
    }
  })

  it('emits full_delta events during streaming', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []

    allEvents.push(...parser.feed('[[[FIELD:0]]]\n[[[FULL]]]\n'))
    allEvents.push(...parser.feed('<p>Hello world, this is a long text'))
    allEvents.push(...parser.feed(' that keeps going</p>'))
    allEvents.push(...parser.flush())

    const deltas = allEvents.filter((e) => e.type === 'full_delta')
    expect(deltas.length).toBeGreaterThanOrEqual(1)

    // Each delta should have accumulated value.
    for (let i = 1; i < deltas.length; i++) {
      expect(
        (deltas[i] as { value: string }).value.length,
      ).toBeGreaterThanOrEqual(
        (deltas[i - 1] as { value: string }).value.length,
      )
    }

    const ends = allEvents.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(1)
  })

  it('flush with no fields does nothing', () => {
    const parser = new FieldStreamParser()
    const events = parser.flush()
    expect(events).toHaveLength(0)
  })

  it('handles preamble text before first field', () => {
    const parser = new FieldStreamParser()
    const events = parser.feed(
      'Some preamble\n[[[FIELD:0]]]\n[[[FULL]]]\nHello',
    )
    const flushEvents = parser.flush()
    const allEvents = [...events, ...flushEvents]

    const starts = allEvents.filter((e) => e.type === 'field_start')
    expect(starts).toHaveLength(1)
    expect(starts[0]).toMatchObject({ index: 0, mode: 'full' })
  })

  it('handles multi-line HTML values in FULL mode', () => {
    const parser = new FieldStreamParser()
    const html = '<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>'
    const events = [
      ...parser.feed(`[[[FIELD:0]]]\n[[[FULL]]]\n${html}`),
      ...parser.flush(),
    ]

    const deltas = events.filter((e) => e.type === 'full_delta')
    const lastDelta = deltas[deltas.length - 1] as { value: string }
    expect(lastDelta.value).toBe(html)
  })

  it('handles multi-line search and replace', () => {
    const parser = new FieldStreamParser()
    const input = [
      '[[[FIELD:0]]]',
      '[[[SEARCH]]]',
      '<p>Old paragraph one.</p>',
      '<p>Old paragraph two.</p>',
      '[[[REPLACE]]]',
      '<p>New paragraph one.</p>',
      '<p>New paragraph two.</p>',
    ].join('\n')

    const events = [...parser.feed(input), ...parser.flush()]

    const operations = events.filter(
      (e) => e.type === 'operation_end',
    ) as Array<{
      search: string
      replace: string
    }>
    expect(operations).toHaveLength(1)
    expect(operations[0].search).toBe(
      '<p>Old paragraph one.</p>\n<p>Old paragraph two.</p>',
    )
    expect(operations[0].replace).toBe(
      '<p>New paragraph one.</p>\n<p>New paragraph two.</p>',
    )
  })

  it('handles split across markers', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []

    allEvents.push(...parser.feed('[[[FIELD:0]]]\n[[[FU'))
    allEvents.push(...parser.feed('LL]]]\nHello'))
    allEvents.push(...parser.flush())

    const starts = allEvents.filter((e) => e.type === 'field_start')
    expect(starts).toHaveLength(1)
    expect(starts[0]).toMatchObject({ index: 0, mode: 'full' })

    const ends = allEvents.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(1)
  })

  it('handles split across FIELD marker', () => {
    const parser = new FieldStreamParser()
    const allEvents: ParserEvent[] = []

    allEvents.push(...parser.feed('[[[FIELD:0]]]\n[[[FULL]]]\nFirst\n[[[FIE'))
    allEvents.push(...parser.feed('LD:1]]]\n[[[FULL]]]\nSecond'))
    allEvents.push(...parser.flush())

    const starts = allEvents.filter((e) => e.type === 'field_start')
    expect(starts).toHaveLength(2)

    const ends = allEvents.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(2)
  })

  it('closing a SEARCH/REPLACE field via new FIELD marker', () => {
    const parser = new FieldStreamParser()
    const input = [
      '[[[FIELD:0]]]',
      '[[[SEARCH]]]',
      'old',
      '[[[REPLACE]]]',
      'new',
      '[[[FIELD:1]]]',
      '[[[FULL]]]',
      'complete',
    ].join('\n')

    const events = [...parser.feed(input), ...parser.flush()]

    const operations = events.filter((e) => e.type === 'operation_end')
    expect(operations).toHaveLength(1)
    expect(operations[0]).toMatchObject({ search: 'old', replace: 'new' })

    const ends = events.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(2)
  })

  it('handles field marker without trailing newline', () => {
    const parser = new FieldStreamParser()
    const events = [
      ...parser.feed('[[[FIELD:0]]][[[FULL]]]Hello'),
      ...parser.flush(),
    ]

    const starts = events.filter((e) => e.type === 'field_start')
    expect(starts).toHaveLength(1)

    const ends = events.filter((e) => e.type === 'field_end')
    expect(ends).toHaveLength(1)
  })
})
