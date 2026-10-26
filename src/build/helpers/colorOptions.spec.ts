import { describe, expect, test } from 'vitest'
import { getDefaultColorOptions } from './colorOptions'

describe('getDefaultColorOptions', () => {
  test('translates the labels of the palette', () => {
    const options = getDefaultColorOptions({
      de: { colorOption_blue_label: 'Blau', colorOption_red_label: '' },
      fr: { colorOption_blue_label: 'Bleu' },
    })
    expect(options.blue).toEqual({
      hex: '#3b82f6',
      label: { en: 'Blue', de: 'Blau', fr: 'Bleu' },
    })
    // An empty translation falls back to English.
    expect(options.red).toEqual({ hex: '#ef4444', label: { en: 'Red' } })
  })
})
