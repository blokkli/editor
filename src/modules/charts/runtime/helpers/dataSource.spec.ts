import { describe, expect, test } from 'vitest'
import { applyDataSourceOverrides } from './dataSource'
import type { ChartDataSourcePayload, ChartDataSourceRef } from '../types'

const PALETTE = ['blue', 'green', 'yellow']

/** The overrides, as an editor sets them while editing in English. */
const DATA_SOURCE: ChartDataSourceRef = {
  id: 'budget',
  label: 'Budget',
  seriesOverrides: {
    expenses: { color: 'red' },
    income: { hidden: true },
  },
  categoryColorOverrides: { transport: 'orange' },
}

/** The same data, fetched in German. */
const GERMAN_PAYLOAD: ChartDataSourcePayload = {
  categories: [
    { key: 'education', label: 'Bildung' },
    { key: 'transport', label: 'Verkehr' },
  ],
  series: [
    { key: 'expenses', name: 'Aufwand', data: [10, 20] },
    { key: 'income', name: 'Ertrag', data: [5, 15] },
  ],
}

describe('applyDataSourceOverrides', () => {
  test('applies the overrides by key, in any language', () => {
    expect(
      applyDataSourceOverrides(GERMAN_PAYLOAD, DATA_SOURCE, PALETTE),
    ).toEqual({
      categories: ['Bildung', 'Verkehr'],
      series: [{ name: 'Aufwand', color: 'red', data: [10, 20] }],
      categoryColors: ['blue', 'orange'],
    })
  })

  test('ignores overrides keyed by a name', () => {
    const result = applyDataSourceOverrides(
      GERMAN_PAYLOAD,
      {
        id: 'budget',
        label: 'Budget',
        seriesOverrides: { Ertrag: { hidden: true } },
        categoryColorOverrides: { Bildung: 'orange' },
      },
      PALETTE,
    )
    expect(result.series.map((s) => s.name)).toEqual(['Aufwand', 'Ertrag'])
    expect(result.categoryColors).toEqual(['blue', 'green'])
  })

  test('takes the palette colors of the visible series in order', () => {
    const result = applyDataSourceOverrides(
      {
        categories: [],
        series: [
          { key: 'a', name: 'A', data: [] },
          { key: 'b', name: 'B', data: [] },
          { key: 'c', name: 'C', data: [] },
        ],
      },
      { id: 'x', label: 'X', seriesOverrides: { a: { hidden: true } } },
      PALETTE,
    )
    expect(result.series.map((s) => s.color)).toEqual(['blue', 'green'])
  })
})
