export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'heatmap'

export type ChartTypeCapabilities = {
  hasMultipleSeries: boolean
  hasSeriesColors: boolean
  hasCategoryColors: boolean
}

export const CHART_CAPABILITIES: Record<ChartType, ChartTypeCapabilities> = {
  bar: { hasMultipleSeries: true, hasSeriesColors: true, hasCategoryColors: false },
  line: { hasMultipleSeries: true, hasSeriesColors: true, hasCategoryColors: false },
  area: { hasMultipleSeries: true, hasSeriesColors: true, hasCategoryColors: false },
  pie: { hasMultipleSeries: false, hasSeriesColors: false, hasCategoryColors: true },
  donut: { hasMultipleSeries: false, hasSeriesColors: false, hasCategoryColors: true },
  heatmap: { hasMultipleSeries: true, hasSeriesColors: false, hasCategoryColors: false },
}

export function getCapabilities(type: ChartType): ChartTypeCapabilities {
  return CHART_CAPABILITIES[type]
}

export type ChartSeries = {
  name: string
  /**
   * The color identifier as defined in the module options.
   */
  color: string
  data: number[]
}

export type BlokkliChartData = {
  title: string
  type: ChartType
  categories: string[]
  series: ChartSeries[]
  /**
   * Color identifiers per category, used for pie/donut charts where each
   * slice has its own color.
   */
  categoryColors: string[]
  footnotes: string[]
}

const SUPERSCRIPTS: Record<string, string> = {
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

export { SUPERSCRIPTS }

/**
 * Replace `{1}`, `{2}`, etc. with Unicode superscript characters.
 */
export function applyFootnotes(text: string): string {
  return text.replace(
    /\{(\d)\}/g,
    (_, d: string) => SUPERSCRIPTS[d] || `{${d}}`,
  )
}

export type ChartColor = {
  color: string
  label: string
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
  }
}
