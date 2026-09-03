import { describe, it, expect } from 'vitest'
import {
  isValidDate,
  toDateInputValue,
  toTimeInputValue,
  parseTime,
  composeLocalDateTime,
} from './index'

describe('isValidDate', () => {
  it('accepts a valid date', () => {
    expect(isValidDate(new Date('2026-09-04T12:00:00'))).toBe(true)
  })

  it('rejects an invalid date', () => {
    expect(isValidDate(new Date('not a date'))).toBe(false)
  })

  it('rejects non-date values', () => {
    expect(isValidDate('2026-09-04' as unknown as Date)).toBe(false)
  })
})

describe('toDateInputValue', () => {
  it('formats with zero padding', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('toTimeInputValue', () => {
  it('formats with zero padding', () => {
    expect(toTimeInputValue(new Date(2026, 0, 5, 7, 3))).toBe('07:03')
  })
})

describe('parseTime', () => {
  it('parses a valid time', () => {
    expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 })
  })

  it('parses a time with seconds', () => {
    expect(parseTime('23:59:30')).toEqual({ hours: 23, minutes: 59 })
  })

  it('returns null for an empty string', () => {
    expect(parseTime('')).toBeNull()
  })

  it('returns null for garbage', () => {
    expect(parseTime('NaN:00')).toBeNull()
    expect(parseTime('9:30')).toBeNull()
  })

  it('returns null for out of range values', () => {
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
  })
})

describe('composeLocalDateTime', () => {
  it('combines date and time in local time', () => {
    const result = composeLocalDateTime('2026-09-04', '09:30')
    expect(result).toEqual(new Date(2026, 8, 4, 9, 30))
  })

  it('returns null when the date is empty', () => {
    expect(composeLocalDateTime('', '09:30')).toBeNull()
  })

  it('returns null when the time is empty', () => {
    expect(composeLocalDateTime('2026-09-04', '')).toBeNull()
  })

  it('returns null for an invalid date value', () => {
    expect(composeLocalDateTime('2026-13-45', '09:30')).toBeNull()
    expect(composeLocalDateTime('NaN-NaN-NaN', '09:30')).toBeNull()
  })
})
