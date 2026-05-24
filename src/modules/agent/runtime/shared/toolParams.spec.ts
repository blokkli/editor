import { describe, it, expect } from 'vitest'
import { coerceStringifiedParams } from './toolParams'

describe('coerceStringifiedParams', () => {
  it('parses a stringified array back into an array', () => {
    expect(coerceStringifiedParams({ uuids: '["a","b"]' })).toEqual({
      uuids: ['a', 'b'],
    })
  })

  it('parses a stringified object back into an object', () => {
    expect(coerceStringifiedParams({ opts: '{"x":1}' })).toEqual({
      opts: { x: 1 },
    })
  })

  it('leaves real arrays/objects and other primitives untouched', () => {
    expect(
      coerceStringifiedParams({
        uuids: ['a'],
        index: 5,
        flag: true,
        name: 'plain string',
      }),
    ).toEqual({ uuids: ['a'], index: 5, flag: true, name: 'plain string' })
  })

  it('keeps the original string when it looks like JSON but does not parse', () => {
    expect(coerceStringifiedParams({ note: '[not json' })).toEqual({
      note: '[not json',
    })
  })

  it('does not touch strings that do not start with [ or {', () => {
    expect(coerceStringifiedParams({ q: 'hello [world]' })).toEqual({
      q: 'hello [world]',
    })
  })
})
