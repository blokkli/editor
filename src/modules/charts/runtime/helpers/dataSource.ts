import type {
  ChartDataSourcePayload,
  ChartDataSourceRef,
  ChartSeries,
} from '../types'

/**
 * The chart data of a data source's payload, with the chart's overrides: hidden
 * series are left out, and colors without an override come from the palette.
 * The overrides are keyed by the payload's keys, so they apply in every
 * language.
 */
export function applyDataSourceOverrides(
  payload: ChartDataSourcePayload,
  dataSource: ChartDataSourceRef,
  palette: string[],
): { categories: string[]; series: ChartSeries[]; categoryColors: string[] } {
  const overrides = dataSource.seriesOverrides ?? {}
  const categoryOverrides = dataSource.categoryColorOverrides ?? {}
  const fallback = palette[0] ?? ''
  const paletteColor = (index: number) =>
    palette[index % Math.max(palette.length, 1)] ?? fallback

  const series: ChartSeries[] = payload.series
    .filter((s) => overrides[s.key]?.hidden !== true)
    .map((s, i) => ({
      name: s.name,
      color: overrides[s.key]?.color ?? paletteColor(i),
      data: s.data,
    }))

  return {
    categories: payload.categories.map((category) => category.label),
    series,
    categoryColors: payload.categories.map(
      (category, i) => categoryOverrides[category.key] ?? paletteColor(i),
    ),
  }
}
