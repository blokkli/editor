import { test, describe, expect } from 'vitest'
import { toRuntimeOptionArray } from './blockOptions'
import type { BlockOptionDefinitionBase } from '../../global/types/blockOptions'

describe('toRuntimeOptionArray', () => {
  test('converts text option', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'text',
      label: 'Text',
      default: 'hello',
    }
    expect(toRuntimeOptionArray(option)).toEqual(['text', 'hello'])
  })

  test('converts checkbox option', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'checkbox',
      label: 'Checkbox',
      default: true,
    }
    expect(toRuntimeOptionArray(option)).toEqual(['checkbox', true])
  })

  test('converts color option', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'color',
      label: 'Color',
      default: '#ff0000',
    }
    expect(toRuntimeOptionArray(option)).toEqual(['color', '#ff0000'])
  })

  test('converts radios option with allowed keys', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'radios',
      label: 'Radios',
      default: 'one',
      options: {
        one: 'One',
        two: 'Two',
        three: 'Three',
      },
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'radios',
      'one',
      ['one', 'two', 'three'],
    ])
  })

  test('converts radios option with colors displayAs', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'radios',
      label: 'Colors',
      default: 'red',
      displayAs: 'colors',
      options: {
        red: { hex: '#ff0000', label: 'Red' },
        blue: { hex: '#0000ff', label: 'Blue' },
      },
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'radios',
      'red',
      ['red', 'blue'],
    ])
  })

  test('converts checkboxes option with allowed keys', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'checkboxes',
      label: 'Checkboxes',
      default: ['one', 'two'],
      options: {
        one: 'One',
        two: 'Two',
        three: 'Three',
      },
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'checkboxes',
      ['one', 'two'],
      ['one', 'two', 'three'],
    ])
  })

  test('converts number option with min/max bounds', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'number',
      label: 'Number',
      default: 50,
      min: 0,
      max: 100,
    }
    expect(toRuntimeOptionArray(option)).toEqual(['number', 50, [0, 100]])
  })

  test('converts range option with min/max bounds', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'range',
      label: 'Range',
      default: 5,
      min: 1,
      max: 10,
      step: 1,
    }
    expect(toRuntimeOptionArray(option)).toEqual(['range', 5, [1, 10]])
  })

  test('converts datetime-local option without bounds', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'datetime-local',
      label: 'DateTime',
      default: '2024-01-15T12:00',
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'datetime-local',
      '2024-01-15T12:00',
    ])
  })

  test('converts datetime-local option with min bound only', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'datetime-local',
      label: 'DateTime',
      default: '2024-01-15T12:00',
      min: '2024-01-01T00:00',
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'datetime-local',
      '2024-01-15T12:00',
      ['2024-01-01T00:00', undefined],
    ])
  })

  test('converts datetime-local option with max bound only', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'datetime-local',
      label: 'DateTime',
      default: '2024-01-15T12:00',
      max: '2024-12-31T23:59',
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'datetime-local',
      '2024-01-15T12:00',
      [undefined, '2024-12-31T23:59'],
    ])
  })

  test('converts datetime-local option with both bounds', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'datetime-local',
      label: 'DateTime',
      default: '2024-06-15T12:00',
      min: '2024-01-01T00:00',
      max: '2024-12-31T23:59',
    }
    expect(toRuntimeOptionArray(option)).toEqual([
      'datetime-local',
      '2024-06-15T12:00',
      ['2024-01-01T00:00', '2024-12-31T23:59'],
    ])
  })

  test('converts json option without dataType', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'json',
      label: 'Data',
      default: '{}',
    }
    expect(toRuntimeOptionArray(option)).toEqual(['json', '{}'])
  })

  test('converts json option with dataType', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'json',
      label: 'Chart data',
      default: '{}',
      dataType: 'chart',
    }
    expect(toRuntimeOptionArray(option)).toEqual(['json', '{}', 'chart'])
  })

  test('converts datetime-local option with undefined default', () => {
    const option: BlockOptionDefinitionBase = {
      type: 'datetime-local',
      label: 'DateTime',
    }
    expect(toRuntimeOptionArray(option)).toEqual(['datetime-local', undefined])
  })
})
