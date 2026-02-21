import type { BlokkliChartData, ChartColor } from '../types'

export const SUPERSCRIPTS: Record<string, string> = {
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079',
  '0': '\u2070',
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
 * Resolve a color ID to a concrete CSS color value that ApexCharts can use.
 *
 * Plain values like '#ff0000' or 'rgb(255, 0, 0)' are returned as-is.
 * Values containing 'var(' (e.g. 'rgb(var(--theme-primary))') are resolved
 * by setting the value on a DOM element and reading the computed color.
 *
 * Falls back to the first defined color if the ID is not found.
 */
export function resolveChartColor(
  colorId: string,
  colors: Record<string, ChartColor>,
  el?: HTMLElement | null,
): string {
  const ids = Object.keys(colors)
  const entry = colors[colorId] || colors[ids[0] || '']
  if (!entry) {
    return '#888888'
  }
  const value = entry.color
  if (!value.includes('var(')) {
    return value
  }
  const target = el || document.documentElement
  const prev = target.style.color
  target.style.color = value
  const resolved = getComputedStyle(target).color
  target.style.color = prev
  return resolved || value
}

/**
 * Get the fallback color ID (first defined color).
 */
export function getFirstColorId(colors: Record<string, ChartColor>): string {
  return Object.keys(colors)[0] || ''
}

/**
 * Get a color ID for the given index, cycling through available colors.
 */
export function getColorIdAtIndex(
  index: number,
  colors: Record<string, ChartColor>,
): string {
  const ids = Object.keys(colors)
  return ids[index % ids.length] || ids[0] || ''
}

export function getDefaultChartData(
  colors: Record<string, ChartColor>,
): BlokkliChartData {
  return {
    title: '',
    type: 'bar',
    categories: ['Category 1', 'Category 2', 'Category 3'],
    series: [
      {
        name: 'Series 1',
        color: getColorIdAtIndex(0, colors),
        data: [30, 40, 35],
      },
    ],
    categoryColors: [
      getColorIdAtIndex(0, colors),
      getColorIdAtIndex(1, colors),
      getColorIdAtIndex(2, colors),
    ],
    footnotes: [],
    typeOptions: {},
  }
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
