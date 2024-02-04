import { test, describe, expect } from 'vitest'
import { getRuntimeOptionValue } from '.'
import type { BlockOptionDefinition } from '#blokkli/types/blokkOptions'

describe('getRuntimeOptionValue', () => {
  test('Returns the correct value for type checkbox', () => {
    const checkbox: BlockOptionDefinition = {
      type: 'checkbox',
      label: 'Foobar',
      default: false,
    }
    expect(getRuntimeOptionValue(checkbox, '1')).toBe(true)
    expect(getRuntimeOptionValue(checkbox, '0')).toBe(false)
    expect(getRuntimeOptionValue(checkbox, true)).toBe(true)
    expect(getRuntimeOptionValue(checkbox, false)).toBe(false)
    expect(getRuntimeOptionValue(checkbox, 'true')).toBe(true)
    expect(getRuntimeOptionValue(checkbox, 'false')).toBe(false)
    expect(getRuntimeOptionValue(checkbox, null)).toBe(false)
    expect(getRuntimeOptionValue(checkbox, undefined)).toBe(false)
  })

  test('Returns the correct value for type checkboxes', () => {
    const checkbox: BlockOptionDefinition = {
      type: 'checkboxes',
      label: 'Foobar',
      default: ['one'],
      options: {
        one: 'One',
        two: 'Two',
        three: 'Three',
      },
    }
    expect(getRuntimeOptionValue(checkbox, 'one')).toEqual(['one'])
    expect(getRuntimeOptionValue(checkbox, 'one,two,three')).toEqual([
      'one',
      'two',
      'three',
    ])
    expect(getRuntimeOptionValue(checkbox, ['one'])).toEqual(['one'])
    expect(getRuntimeOptionValue(checkbox, undefined)).toEqual([])
  })

  test('Returns the correct value for type radios', () => {
    const checkbox: BlockOptionDefinition = {
      type: 'radios',
      label: 'Foobar',
      default: 'one',
      options: {
        one: 'One',
        two: 'Two',
        three: 'Three',
      },
    }
    expect(getRuntimeOptionValue(checkbox, 'one')).toEqual('one')
    expect(getRuntimeOptionValue(checkbox, '')).toEqual('')
    expect(getRuntimeOptionValue(checkbox, false)).toEqual('')
    expect(getRuntimeOptionValue(checkbox, undefined)).toEqual('')
  })

  test('Returns the correct value for type text', () => {
    const checkbox: BlockOptionDefinition = {
      type: 'text',
      label: 'Foobar',
      default: '',
    }
    expect(getRuntimeOptionValue(checkbox, 'one')).toEqual('one')
    expect(getRuntimeOptionValue(checkbox, '')).toEqual('')
    expect(getRuntimeOptionValue(checkbox, false)).toEqual('')
    expect(getRuntimeOptionValue(checkbox, undefined)).toEqual('')
  })
})
