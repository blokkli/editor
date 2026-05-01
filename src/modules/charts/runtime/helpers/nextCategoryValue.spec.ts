import { test, describe, expect } from 'vitest'
import { nextCategoryValue } from './nextCategoryValue'

describe('nextCategoryValue', () => {
  test('falls back when fewer than two categories', () => {
    expect(nextCategoryValue([])).toBe('Category 1')
    expect(nextCategoryValue(['Foo'])).toBe('Category 2')
  })

  test('falls back for free-form labels', () => {
    expect(nextCategoryValue(['Apple', 'Banana', 'Cherry'])).toBe('Category 4')
  })

  test('detects integer years (step 1)', () => {
    expect(nextCategoryValue(['2019', '2020', '2021', '2022', '2023'])).toBe(
      '2024',
    )
  })

  test('detects integer step > 1', () => {
    expect(nextCategoryValue(['10', '20', '30'])).toBe('40')
    expect(nextCategoryValue(['100', '150', '200'])).toBe('250')
  })

  test('detects negative step', () => {
    expect(nextCategoryValue(['2024', '2023', '2022'])).toBe('2021')
  })

  test('detects negative integers', () => {
    expect(nextCategoryValue(['-3', '-2', '-1'])).toBe('0')
  })

  test('rejects non-monotonic integer series', () => {
    expect(nextCategoryValue(['2019', '2021', '2024'])).toBe('Category 4')
  })

  test('rejects all-equal integer series', () => {
    expect(nextCategoryValue(['5', '5', '5'])).toBe('Category 4')
  })

  test('detects MM/YYYY with year carry', () => {
    expect(nextCategoryValue(['10/2023', '11/2023', '12/2023'])).toBe('01/2024')
  })

  test('detects MM/YYYY across multiple years', () => {
    expect(
      nextCategoryValue(['01/2024', '02/2024', '03/2024', '04/2024']),
    ).toBe('05/2024')
  })

  test('detects MM/YYYY with quarterly step', () => {
    expect(nextCategoryValue(['01/2024', '04/2024', '07/2024'])).toBe('10/2024')
  })

  test('detects YYYY-MM', () => {
    expect(nextCategoryValue(['2024-01', '2024-02', '2024-03'])).toBe('2024-04')
  })

  test('detects YYYY-MM with year carry', () => {
    expect(nextCategoryValue(['2023-11', '2023-12'])).toBe('2024-01')
  })

  test('rejects mixed formats', () => {
    expect(nextCategoryValue(['2019', '2020', '03/2024'])).toBe('Category 4')
    expect(nextCategoryValue(['2024-01', 'Feb 2024'])).toBe('Category 3')
  })

  test('rejects invalid month numbers in MM/YYYY', () => {
    expect(nextCategoryValue(['13/2024', '14/2024'])).toBe('Category 3')
  })

  test('rejects MM/YYYY with non-constant step', () => {
    expect(nextCategoryValue(['01/2024', '03/2024', '04/2024'])).toBe(
      'Category 4',
    )
  })

  test('trims whitespace before matching', () => {
    expect(nextCategoryValue(['  2019  ', ' 2020 ', '2021'])).toBe('2022')
  })

  test('strips footnote markers before integer detection', () => {
    expect(nextCategoryValue(['2019{1}', '2020{2}', '2021'])).toBe('2022')
  })

  test('strips multiple footnote markers in one category', () => {
    expect(nextCategoryValue(['2019{1}{2}', '2020', '2021{3}'])).toBe('2022')
  })

  test('strips footnotes before MM/YYYY detection', () => {
    expect(
      nextCategoryValue(['10/2023{1}', '11/2023', '12/2023{2}']),
    ).toBe('01/2024')
  })

  test('strips footnotes before YYYY-MM detection', () => {
    expect(nextCategoryValue(['2024-01{1}', '2024-02{2}', '2024-03'])).toBe(
      '2024-04',
    )
  })

  test('detects German month names', () => {
    expect(nextCategoryValue(['Januar', 'Februar', 'März'])).toBe('April')
  })

  test('detects English month names', () => {
    expect(nextCategoryValue(['January', 'February', 'March'])).toBe('April')
  })

  test('detects French month names', () => {
    expect(nextCategoryValue(['janvier', 'février', 'mars'])).toBe('avril')
  })

  test('detects Italian month names', () => {
    expect(nextCategoryValue(['gennaio', 'febbraio', 'marzo'])).toBe('aprile')
  })

  test('wraps from December to January (German)', () => {
    expect(nextCategoryValue(['Oktober', 'November', 'Dezember'])).toBe(
      'Januar',
    )
  })

  test('wraps backwards from January to December (German)', () => {
    expect(nextCategoryValue(['März', 'Februar', 'Januar'])).toBe('Dezember')
  })

  test('handles month names case-insensitively', () => {
    expect(nextCategoryValue(['JANUAR', 'februar', 'März'])).toBe('April')
  })

  test('strips footnotes before month-name detection', () => {
    expect(nextCategoryValue(['Januar{1}', 'Februar', 'März{2}'])).toBe('April')
  })

  test('rejects mixed-locale month names', () => {
    expect(nextCategoryValue(['Januar', 'February'])).toBe('Category 3')
  })

  test('rejects non-constant month-name step', () => {
    expect(nextCategoryValue(['Januar', 'März', 'April'])).toBe('Category 4')
  })

  test('rejects all-same month names', () => {
    expect(nextCategoryValue(['Januar', 'Januar', 'Januar'])).toBe('Category 4')
  })
})
