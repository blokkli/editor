import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { coerceStringifiedParams, booleanParam } from './toolParams'

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

describe('booleanParam', () => {
  const schema = booleanParam('A flag')

  it('coerces the string "false" to a boolean', () => {
    expect(schema.parse('false')).toBe(false)
  })

  it('coerces the string "true" to a boolean', () => {
    expect(schema.parse('true')).toBe(true)
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(schema.parse('FALSE')).toBe(false)
    expect(schema.parse(' True ')).toBe(true)
  })

  it('passes through real booleans unchanged', () => {
    expect(schema.parse(true)).toBe(true)
    expect(schema.parse(false)).toBe(false)
  })

  it('still rejects non-boolean-ish values rather than swallowing them', () => {
    expect(() => schema.parse('maybe')).toThrow()
    expect(() => schema.parse(1)).toThrow()
  })

  it('advertises a boolean (with description) in the generated JSON Schema', () => {
    const json = z.toJSONSchema(schema) as Record<string, unknown>
    expect(json.type).toBe('boolean')
    expect(json.description).toBe('A flag')
  })

  it('chains with .optional() and .default()', () => {
    const optional = booleanParam('x').optional()
    expect(optional.parse(undefined)).toBeUndefined()
    expect(optional.parse('false')).toBe(false)

    const withDefault = booleanParam('x').optional().default(true)
    expect(withDefault.parse(undefined)).toBe(true)
    expect(withDefault.parse('false')).toBe(false)
  })
})
