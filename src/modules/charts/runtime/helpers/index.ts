import type { BlokkliChartData } from '../types'
import type { ColorOption } from '#blokkli/types/colors'
import { canonicalColorId } from '#blokkli/helpers/colors'
import { detectDateFormat } from './dateFormat'

export const SUPERSCRIPTS: Record<string, string> = {
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '0': '⁰',
}

/**
 * Replace `{1}`, `{2}`, etc. with Unicode superscript characters.
 */
export function applyFootnotes(text: string): string {
  return text.replace(
    /\{(\d)\}/g,
    (_, d: string) => SUPERSCRIPTS[d] || `{${d}}`,
  )
}

/**
 * Get the fallback color ID (first defined color).
 */
export function getFirstColorId(options: ColorOption[]): string {
  return options[0] ? canonicalColorId(options[0]) : ''
}

/**
 * Get a color ID for the given index, cycling through available colors.
 * Always returns the canonical form (`<base>.<mainShade>` for ramps).
 */
export function getColorIdAtIndex(
  index: number,
  options: ColorOption[],
): string {
  if (options.length === 0) return ''
  const option = options[index % options.length] ?? options[0]!
  return canonicalColorId(option)
}

export function getDefaultChartData(options: ColorOption[]): BlokkliChartData {
  return {
    title: '',
    type: 'bar',
    categories: ['Category 1', 'Category 2', 'Category 3'],
    series: [
      {
        name: 'Series 1',
        color: getColorIdAtIndex(0, options),
        data: [30, 40, 35],
      },
    ],
    categoryColors: [
      getColorIdAtIndex(0, options),
      getColorIdAtIndex(1, options),
      getColorIdAtIndex(2, options),
    ],
    footnotes: [],
    typeOptions: {},
  }
}

/**
 * Whether all (non-empty) category labels look like numbers — e.g. years
 * (2012, 2013, …) or plain numeric values. Used to decide whether categories
 * should be exposed for translation. Empty arrays return `false`.
 */
export function categoriesAreNumeric(categories: string[]): boolean {
  let hasAny = false
  for (const c of categories) {
    const trimmed = c.trim()
    if (!trimmed) continue
    if (!Number.isFinite(Number(trimmed))) return false
    hasAny = true
  }
  return hasAny
}

/**
 * Whether all (non-empty) category labels match a known date source format
 * (MM/YYYY, YYYY-MM, YYYY-MM-DD, DD.MM.YYYY). Used to decide whether to apply
 * date formatting and to gate categories from being translatable.
 */
export function categoriesAreDates(categories: string[]): boolean {
  return detectDateFormat(categories) !== null
}

export function parseNumericInput(raw: string): number {
  let str = raw.trim()
  if (!str) return 0

  // Remove apostrophe thousands separators (e.g. 156'000).
  str = str.replace(/'/g, '')

  // Determine if comma is a decimal or thousands separator.
  // If comma is followed by exactly 3 digits (possibly repeated), treat as
  // thousands separator (e.g. 153,224,152). Otherwise treat as decimal
  // (e.g. 142,40).
  if (str.includes(',')) {
    const isThousandsSep = /,\d{3}(?:,\d{3})*$/.test(str)
    if (isThousandsSep) {
      str = str.replace(/,/g, '')
    } else {
      // Treat comma as decimal: remove any dots (thousands) and replace
      // the last comma with a dot.
      str = str.replace(/\./g, '')
      const lastComma = str.lastIndexOf(',')
      str = str.slice(0, lastComma) + '.' + str.slice(lastComma + 1)
    }
  }

  const value = Number.parseFloat(str)
  return Number.isFinite(value) ? value : 0
}
