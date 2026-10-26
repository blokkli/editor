import { describe, expect, test } from 'vitest'
import { validateColorOption } from './validateColorOptions'

describe('validateColorOption', () => {
  test('accepts a label', () => {
    expect(
      validateColorOption('lake', { label: 'Lake', hex: '#1f5a8c' }),
    ).toEqual([])
  })

  test('accepts a label per language', () => {
    expect(
      validateColorOption('lake', {
        label: { en: 'Lake', de: 'See' },
        hex: '#1f5a8c',
      }),
    ).toEqual([])
  })

  test.each([
    ['an empty label', ''],
    ['no languages', {}],
    ['an empty translation', { en: 'Lake', de: '' }],
  ])('refuses %s', (_, label) => {
    expect(
      validateColorOption('lake', { label, hex: '#1f5a8c' }).map(
        (error) => error.message,
      ),
    ).toEqual(['Option "lake" is missing a non-empty "label".'])
  })
})
