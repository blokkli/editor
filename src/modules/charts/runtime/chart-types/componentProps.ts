import type { ChartNumberFormat } from '../types'

/**
 * The common props every chart-type component receives from `ChartRenderer`.
 * Values are fully resolved (translations, date formatting, footnotes,
 * dynamic-data overrides, hex colors) — the type component only needs to
 * map them into its ECharts `option` object.
 */
export type ChartTypeRenderProps = {
  title: string
  categories: string[]
  series: { name: string; data: number[] }[]
  /** Hex colors aligned with `series` order. Read by types with series colors. */
  seriesHexColors: string[]
  /** Hex colors aligned with `categories` order. Read by types with category colors. */
  categoryHexColors: string[]
  typeOptions: Record<string, unknown>
  numberFormat?: ChartNumberFormat
  isEditing: boolean
}

/**
 * Map our editor-facing legend-position option to ECharts's legend object
 * (which uses `left`/`right`/`top`/`bottom` + `orient`).
 */
export function legendPositionToEcharts(
  pos: string,
): Record<string, string | number> {
  if (pos === 'top') return { left: 'center', top: 5, orient: 'horizontal' }
  if (pos === 'right') return { right: 0, top: 'middle', orient: 'vertical' }
  return { left: 'center', bottom: 0, orient: 'horizontal' }
}
