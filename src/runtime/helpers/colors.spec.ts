import { describe, it, expect } from 'vitest'
import {
  parseColorId,
  canonicalColorId,
  findColorOption,
  isColorIdValid,
  FALLBACK_HEX,
} from './colors'
import type { ColorOption } from '../types/colors'

const FLAT_OPTION: ColorOption = { id: 'blue', label: 'Blue', hex: '#3b82f6' }
const RAMP_OPTION: ColorOption = {
  id: 'red',
  label: 'Red',
  hex: '#ef4444',
  shades: [
    { id: '300', hex: '#fca5a5', isMain: false },
    { id: '500', hex: '#ef4444', isMain: true },
    { id: '700', hex: '#b91c1c', isMain: false },
  ],
}
const OPTIONS = [FLAT_OPTION, RAMP_OPTION]

describe('parseColorId', () => {
  it('splits a shade-qualified id', () => {
    expect(parseColorId('red.500')).toEqual({ baseId: 'red', shadeId: '500' })
  })
  it('returns shadeId undefined for a bare id', () => {
    expect(parseColorId('blue')).toEqual({ baseId: 'blue', shadeId: undefined })
  })
})

describe('canonicalColorId', () => {
  it('returns bare id for a flat color', () => {
    expect(canonicalColorId(FLAT_OPTION)).toBe('blue')
  })
  it('returns `<base>.<mainShade>` for a ramped color', () => {
    expect(canonicalColorId(RAMP_OPTION)).toBe('red.500')
  })
  it('falls back to the first shade when none is marked as main', () => {
    const noMain: ColorOption = {
      id: 'red',
      label: 'Red',
      hex: '#ef4444',
      shades: [
        { id: '300', hex: '#fca5a5', isMain: false },
        { id: '500', hex: '#ef4444', isMain: false },
      ],
    }
    expect(canonicalColorId(noMain)).toBe('red.300')
  })
})

describe('findColorOption', () => {
  it('finds a flat color by bare id', () => {
    expect(findColorOption('blue', OPTIONS)).toBe(FLAT_OPTION)
  })
  it('finds a ramped color by shade-qualified id', () => {
    expect(findColorOption('red.500', OPTIONS)).toBe(RAMP_OPTION)
  })
  it('returns undefined for an unknown base id', () => {
    expect(findColorOption('purple', OPTIONS)).toBeUndefined()
  })
})

describe('isColorIdValid (strict — no bare-for-ramped)', () => {
  it('accepts bare id for a flat color', () => {
    expect(isColorIdValid('blue', OPTIONS)).toBe(true)
  })
  it('rejects shade-qualified id for a flat color', () => {
    expect(isColorIdValid('blue.300', OPTIONS)).toBe(false)
  })
  it('rejects bare id for a ramped color', () => {
    expect(isColorIdValid('red', OPTIONS)).toBe(false)
  })
  it('accepts shade-qualified id when the shade is declared', () => {
    expect(isColorIdValid('red.500', OPTIONS)).toBe(true)
    expect(isColorIdValid('red.300', OPTIONS)).toBe(true)
  })
  it('rejects unknown shades', () => {
    expect(isColorIdValid('red.999', OPTIONS)).toBe(false)
  })
  it('rejects unknown base ids', () => {
    expect(isColorIdValid('purple', OPTIONS)).toBe(false)
    expect(isColorIdValid('purple.500', OPTIONS)).toBe(false)
  })
})

describe('FALLBACK_HEX', () => {
  it('is a constant grey', () => {
    expect(FALLBACK_HEX).toBe('#888888')
  })
})
