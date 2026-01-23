import { test, describe, expect } from 'vitest'
import { getRuntimeOptionValue } from './../../src/runtime/helpers/runtimeHelpers'
import type { BlockOptionDefinition } from '../../src/runtime/types/blockOptions'

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
    expect(getRuntimeOptionValue(checkbox, undefined)).toEqual(['one'])
  })

  test('Filters checkboxes values against allowed keys using RuntimeBlockOptionArray', () => {
    // Using tuple format with allowed keys
    const option: ['checkboxes', string[], string[]] = [
      'checkboxes',
      ['one'],
      ['one', 'two', 'three'],
    ]
    expect(getRuntimeOptionValue(option, 'one,two')).toEqual(['one', 'two'])
    // Invalid values are filtered out
    expect(getRuntimeOptionValue(option, 'one,invalid,two')).toEqual([
      'one',
      'two',
    ])
    expect(getRuntimeOptionValue(option, ['one', 'four', 'three'])).toEqual([
      'one',
      'three',
    ])
    // All invalid returns default
    expect(getRuntimeOptionValue(option, 'invalid,unknown')).toEqual(['one'])
  })

  test('Checkboxes with empty allowed keys accepts all values', () => {
    // Empty allowed keys = accept all values
    const option: ['checkboxes', string[], string[]] = [
      'checkboxes',
      ['default'],
      [],
    ]
    expect(getRuntimeOptionValue(option, 'any,value')).toEqual(['any', 'value'])
    expect(getRuntimeOptionValue(option, ['foo', 'bar'])).toEqual([
      'foo',
      'bar',
    ])
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
    expect(getRuntimeOptionValue(checkbox, false)).toEqual('one')
    expect(getRuntimeOptionValue(checkbox, undefined)).toEqual('one')
  })

  test('Validates radios value against allowed keys using RuntimeBlockOptionArray', () => {
    // Using tuple format with allowed keys
    const option: ['radios', string, string[]] = [
      'radios',
      'one',
      ['one', 'two', 'three'],
    ]
    expect(getRuntimeOptionValue(option, 'one')).toEqual('one')
    expect(getRuntimeOptionValue(option, 'two')).toEqual('two')
    // Invalid value returns default
    expect(getRuntimeOptionValue(option, 'invalid')).toEqual('one')
    expect(getRuntimeOptionValue(option, 'four')).toEqual('one')
  })

  test('Radios with empty allowed keys accepts any value', () => {
    // Empty allowed keys = accept all values
    const option: ['radios', string, string[]] = ['radios', 'default', []]
    expect(getRuntimeOptionValue(option, 'any')).toEqual('any')
    expect(getRuntimeOptionValue(option, 'value')).toEqual('value')
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

  test('Clamps number value to min/max bounds using RuntimeBlockOptionArray', () => {
    // Using tuple format with [min, max] bounds
    const option: ['number', number, [number, number]] = [
      'number',
      50,
      [0, 100],
    ]
    expect(getRuntimeOptionValue(option, 50)).toEqual(50)
    expect(getRuntimeOptionValue(option, '75')).toEqual(75)
    // Clamp to min
    expect(getRuntimeOptionValue(option, -10)).toEqual(0)
    expect(getRuntimeOptionValue(option, '-50')).toEqual(0)
    // Clamp to max
    expect(getRuntimeOptionValue(option, 150)).toEqual(100)
    expect(getRuntimeOptionValue(option, '200')).toEqual(100)
    // Invalid value returns default
    expect(getRuntimeOptionValue(option, undefined)).toEqual(50)
  })

  test('Clamps range value to min/max bounds using RuntimeBlockOptionArray', () => {
    // Using tuple format with [min, max] bounds
    const option: ['range', number, [number, number]] = ['range', 5, [1, 10]]
    expect(getRuntimeOptionValue(option, 5)).toEqual(5)
    expect(getRuntimeOptionValue(option, '7')).toEqual(7)
    // Clamp to min
    expect(getRuntimeOptionValue(option, 0)).toEqual(1)
    // Clamp to max
    expect(getRuntimeOptionValue(option, 15)).toEqual(10)
    // Invalid value returns default
    expect(getRuntimeOptionValue(option, undefined)).toEqual(5)
  })

  test('Validates datetime-local value against min/max bounds using RuntimeBlockOptionArray', () => {
    // Using tuple format with [min, max] bounds
    const option: [
      'datetime-local',
      string | undefined,
      [string | undefined, string | undefined],
    ] = [
      'datetime-local',
      '2024-01-15T12:00',
      ['2024-01-01T00:00', '2024-12-31T23:59'],
    ]
    // Valid value within bounds
    expect(getRuntimeOptionValue(option, '2024-06-15T12:00')).toEqual(
      '2024-06-15T12:00',
    )
    // Value before min returns default
    expect(getRuntimeOptionValue(option, '2023-12-31T23:59')).toEqual(
      '2024-01-15T12:00',
    )
    // Value after max returns default
    expect(getRuntimeOptionValue(option, '2025-01-01T00:00')).toEqual(
      '2024-01-15T12:00',
    )
    // Invalid format returns default
    expect(getRuntimeOptionValue(option, 'invalid')).toEqual('2024-01-15T12:00')
    // Undefined returns default
    expect(getRuntimeOptionValue(option, undefined)).toEqual('2024-01-15T12:00')
  })

  test('Datetime-local without bounds accepts any valid datetime', () => {
    // Using tuple format without bounds
    const option: ['datetime-local', string | undefined] = [
      'datetime-local',
      '2024-01-01T00:00',
    ]
    expect(getRuntimeOptionValue(option, '2020-01-01T00:00')).toEqual(
      '2020-01-01T00:00',
    )
    expect(getRuntimeOptionValue(option, '2030-12-31T23:59')).toEqual(
      '2030-12-31T23:59',
    )
  })

  test('Returns the correct value for type color', () => {
    const option: BlockOptionDefinition = {
      type: 'color',
      label: 'Color',
      default: '#ff0000',
    }
    // Valid hex with #
    expect(getRuntimeOptionValue(option, '#00ff00')).toEqual('#00ff00')
    expect(getRuntimeOptionValue(option, '#AABBCC')).toEqual('#AABBCC')
    expect(getRuntimeOptionValue(option, '#a1b2c3')).toEqual('#a1b2c3')
    // Valid hex without # gets prefixed
    expect(getRuntimeOptionValue(option, '00ff00')).toEqual('#00ff00')
    expect(getRuntimeOptionValue(option, 'aabbcc')).toEqual('#aabbcc')
    // Undefined returns default
    expect(getRuntimeOptionValue(option, undefined)).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, null)).toEqual('#ff0000')
  })

  test('Rejects invalid color values and returns default', () => {
    const option: BlockOptionDefinition = {
      type: 'color',
      label: 'Color',
      default: '#ff0000',
    }
    // Invalid hex characters
    expect(getRuntimeOptionValue(option, '#gggggg')).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, 'zzzzzz')).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, '#xyz123')).toEqual('#ff0000')
    // Wrong length
    expect(getRuntimeOptionValue(option, '#fff')).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, '#12')).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, '#1234567')).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, 'abc')).toEqual('#ff0000')
    // Not a string
    expect(getRuntimeOptionValue(option, 123456)).toEqual('#ff0000')
    expect(getRuntimeOptionValue(option, false)).toEqual('#ff0000')
  })
})
