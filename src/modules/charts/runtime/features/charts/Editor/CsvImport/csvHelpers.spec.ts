import { describe, test, expect } from 'vitest'
import { inferSmartConfig, type CsvGrid } from './csvHelpers'

// Header for the Winterthur age-pyramid dataset (KTZH_00002605_00005330).
// Columns: jahr, stichtag, gemeinde_bfs_nr, gemeinde, altersklasse, heimat,
//          geschlecht, anzahl, anzahl_ist_kleingruppe
const AGE_PYRAMID_HEADER = [
  'jahr',
  'stichtag',
  'gemeinde_bfs_nr',
  'gemeinde',
  'altersklasse',
  'heimat',
  'geschlecht',
  'anzahl',
  'anzahl_ist_kleingruppe',
]

function ageRow(
  jahr: string,
  altersklasse: string,
  heimat: string,
  geschlecht: string,
  anzahl: string,
): string[] {
  return [
    jahr,
    `${jahr}-12-31`,
    '230',
    'Winterthur',
    altersklasse,
    heimat,
    geschlecht,
    anzahl,
    'False',
  ]
}

describe('inferSmartConfig', () => {
  test('age-pyramid CSV: picks altersklasse, anzahl, [heimat, geschlecht], jahr=latest', () => {
    // Two years × three age classes × two countries × two genders = 24 rows.
    // Two years are present so `jahr` is not constant and gets classified as
    // year-like → becomes a filter pinned to the latest year (2025).
    const grid: CsvGrid = [
      AGE_PYRAMID_HEADER,
      ageRow('2024', '00-04', 'Ausland', 'männlich', '770'),
      ageRow('2024', '00-04', 'Ausland', 'weiblich', '730'),
      ageRow('2024', '00-04', 'Schweiz', 'männlich', '2160'),
      ageRow('2024', '00-04', 'Schweiz', 'weiblich', '1980'),
      ageRow('2024', '05-09', 'Ausland', 'männlich', '930'),
      ageRow('2024', '05-09', 'Ausland', 'weiblich', '870'),
      ageRow('2024', '05-09', 'Schweiz', 'männlich', '2280'),
      ageRow('2024', '05-09', 'Schweiz', 'weiblich', '2180'),
      ageRow('2024', '10-14', 'Ausland', 'männlich', '860'),
      ageRow('2024', '10-14', 'Ausland', 'weiblich', '820'),
      ageRow('2024', '10-14', 'Schweiz', 'männlich', '2400'),
      ageRow('2024', '10-14', 'Schweiz', 'weiblich', '2300'),
      ageRow('2025', '00-04', 'Ausland', 'männlich', '774'),
      ageRow('2025', '00-04', 'Ausland', 'weiblich', '735'),
      ageRow('2025', '00-04', 'Schweiz', 'männlich', '2163'),
      ageRow('2025', '00-04', 'Schweiz', 'weiblich', '1982'),
      ageRow('2025', '05-09', 'Ausland', 'männlich', '932'),
      ageRow('2025', '05-09', 'Ausland', 'weiblich', '872'),
      ageRow('2025', '05-09', 'Schweiz', 'männlich', '2284'),
      ageRow('2025', '05-09', 'Schweiz', 'weiblich', '2181'),
      ageRow('2025', '10-14', 'Ausland', 'männlich', '869'),
      ageRow('2025', '10-14', 'Ausland', 'weiblich', '821'),
      ageRow('2025', '10-14', 'Schweiz', 'männlich', '2410'),
      ageRow('2025', '10-14', 'Schweiz', 'weiblich', '2305'),
    ]

    const inferred = inferSmartConfig(grid)

    expect(AGE_PYRAMID_HEADER[inferred.category]).toBe('altersklasse')
    expect(inferred.values.map((i) => AGE_PYRAMID_HEADER[i])).toEqual(['anzahl'])
    expect(inferred.groupBy.map((i) => AGE_PYRAMID_HEADER[i])).toEqual([
      'heimat',
      'geschlecht',
    ])
    expect(inferred.filters).toHaveLength(1)
    expect(AGE_PYRAMID_HEADER[inferred.filters[0]!.column]).toBe('jahr')
    expect(inferred.filters[0]!.values).toEqual(['2025'])

    // gemeinde / gemeinde_bfs_nr are constants → no role.
    // stichtag is a full date → no role.
    // anzahl_ist_kleingruppe is boolean-like → no role.
    expect(inferred.values).not.toContain(
      AGE_PYRAMID_HEADER.indexOf('gemeinde_bfs_nr'),
    )
    expect(inferred.groupBy).not.toContain(
      AGE_PYRAMID_HEADER.indexOf('gemeinde'),
    )
    expect(inferred.groupBy).not.toContain(
      AGE_PYRAMID_HEADER.indexOf('stichtag'),
    )
    expect(inferred.groupBy).not.toContain(
      AGE_PYRAMID_HEADER.indexOf('anzahl_ist_kleingruppe'),
    )
  })

  test('wide CSV: first text column as category, all numeric columns as values', () => {
    const grid: CsvGrid = [
      ['month', 'sales', 'costs'],
      ['Jan', '100', '60'],
      ['Feb', '110', '65'],
      ['Mar', '120', '70'],
      ['Apr', '130', '75'],
    ]

    const inferred = inferSmartConfig(grid)

    expect(inferred.category).toBe(0)
    expect(inferred.values).toEqual([1, 2])
    expect(inferred.groupBy).toEqual([])
    expect(inferred.filters).toEqual([])
  })

  test('returns safe defaults for an empty grid', () => {
    expect(inferSmartConfig([])).toEqual({
      category: 0,
      values: [],
      groupBy: [],
      filters: [],
    })
    expect(inferSmartConfig([[]])).toEqual({
      category: 0,
      values: [],
      groupBy: [],
      filters: [],
    })
  })

  test('single year column: falls back to using year as category, no filter', () => {
    // Only year + measure → year is the only thing that can carry the
    // x-axis. It must become Category, not a filter that strands the chart.
    const grid: CsvGrid = [
      ['jahr', 'umsatz'],
      ['2022', '1000'],
      ['2023', '1200'],
      ['2024', '1500'],
    ]

    const inferred = inferSmartConfig(grid)

    expect(inferred.category).toBe(0)
    expect(inferred.values).toEqual([1])
    expect(inferred.filters).toEqual([])
  })

  test('high-cardinality categorical is excluded from group-by (>50 distinct)', () => {
    const header = ['name', 'team', 'score']
    const teams = ['A', 'B', 'C', 'D']
    const rows: string[][] = [header]
    for (let i = 0; i < 60; i++) {
      rows.push([`Player ${i}`, teams[i % teams.length]!, String(100 + i)])
    }

    const inferred = inferSmartConfig(rows)

    // `name` has 60 distinct values (highest cardinality) → Category.
    // `team` has 4 distinct → eligible group-by.
    // `name` itself, even though it's also categorical, is the category, so
    // it must not also appear in group-by.
    expect(inferred.category).toBe(0)
    expect(inferred.values).toEqual([2])
    expect(inferred.groupBy).toEqual([1])
  })

  test('numeric column with a single distinct value is treated as constant (no role)', () => {
    const grid: CsvGrid = [
      ['region', 'year', 'sales'],
      ['North', '2024', '100'],
      ['South', '2024', '200'],
      ['East', '2024', '150'],
    ]

    const inferred = inferSmartConfig(grid)

    // `year` is constant → no role at all (no filter, no category).
    expect(inferred.filters).toEqual([])
    expect(inferred.category).toBe(0) // region
    expect(inferred.values).toEqual([2]) // sales
    expect(inferred.groupBy).toEqual([])
  })

  test('museum visits CSV: rejects ID and geo columns, picks named measure', () => {
    // Columns mirror KTZH_00002902_00005968 (jahr, stichtag, gemeinde_bfs_nr,
    // gemeinde, typ, id_pro_typ, name, lon, lat, besuche, kommentar).
    // Without the name-based filters, the inference would treat id_pro_typ /
    // lon / lat as Values alongside besuche, then disable Group by because
    // valueColumns.length > 1.
    const header = [
      'jahr',
      'stichtag',
      'gemeinde_bfs_nr',
      'gemeinde',
      'typ',
      'id_pro_typ',
      'name',
      'lon',
      'lat',
      'besuche',
      'kommentar',
    ]
    function row(
      jahr: string,
      typ: string,
      id: string,
      name: string,
      besuche: string,
    ): string[] {
      return [
        jahr,
        `${jahr}-12-31`,
        '230',
        'Winterthur',
        typ,
        id,
        name,
        '8.7',
        '47.5',
        besuche,
        '',
      ]
    }
    const grid: CsvGrid = [
      header,
      row('2023', 'Bibliothek', '1', 'Stadtbibliothek', '309278'),
      row('2023', 'Bibliothek', '2', 'Sammlung Winterthur', '2695'),
      row('2023', 'Museum', '1', 'Technorama', '364286'),
      row('2023', 'Museum', '2', 'Fotomuseum', '10759'),
      row('2023', 'Theater', '1', 'Stadttheater', '120000'),
      row('2024', 'Bibliothek', '1', 'Stadtbibliothek', '320000'),
      row('2024', 'Bibliothek', '2', 'Sammlung Winterthur', '2800'),
      row('2024', 'Museum', '1', 'Technorama', '370000'),
      row('2024', 'Museum', '2', 'Fotomuseum', '11000'),
      row('2024', 'Theater', '1', 'Stadttheater', '125000'),
    ]

    const inferred = inferSmartConfig(grid)

    // Only the count-named column survives as a Value.
    expect(inferred.values.map((i) => header[i])).toEqual(['besuche'])

    // ID, lon, lat are rejected from every role.
    expect(inferred.values).not.toContain(header.indexOf('id_pro_typ'))
    expect(inferred.values).not.toContain(header.indexOf('lon'))
    expect(inferred.values).not.toContain(header.indexOf('lat'))
    expect(inferred.groupBy).not.toContain(header.indexOf('id_pro_typ'))
    expect(inferred.groupBy).not.toContain(header.indexOf('lon'))
    expect(inferred.groupBy).not.toContain(header.indexOf('lat'))

    // The year column is multi-valued → becomes a filter pinned to 2024.
    expect(inferred.filters).toHaveLength(1)
    expect(header[inferred.filters[0]!.column]).toBe('jahr')
    expect(inferred.filters[0]!.values).toEqual(['2024'])

    // typ (3 distinct) is in group-by; the highest-cardinality categorical
    // (`name`, 5 distinct here) is the category.
    expect(header[inferred.category]).toBe('name')
    expect(inferred.groupBy.map((i) => header[i])).toContain('typ')
  })

  test('measure-name filter has no effect when no column is measure-named', () => {
    // No column matches the measure-name pattern, so the inference falls back
    // to using every all-numeric column as a Value (same as before this rule).
    const grid: CsvGrid = [
      ['region', 'a', 'b'],
      ['North', '10', '5'],
      ['South', '20', '7'],
      ['East', '15', '6'],
    ]
    const inferred = inferSmartConfig(grid)
    expect(inferred.values).toEqual([1, 2])
  })

  test('rejects standalone "id" column even when not numeric', () => {
    const grid: CsvGrid = [
      ['id', 'category', 'anzahl'],
      ['a1', 'X', '10'],
      ['a2', 'Y', '20'],
      ['a3', 'Z', '30'],
    ]
    const inferred = inferSmartConfig(grid)
    // id should not be Category even though it's categorical and
    // highest-cardinality.
    expect(grid[0]![inferred.category]).toBe('category')
    expect(inferred.groupBy).not.toContain(0)
  })

  test('age-range labels like "00-04" are not mistaken for numbers', () => {
    // Regression: an earlier looksNumeric implementation matched the leading
    // digits of "00-04" / "2025-12-31" via parseFloat, which made
    // altersklasse get classified as a measure instead of a category.
    const grid: CsvGrid = [
      ['altersklasse', 'anzahl'],
      ['00-04', '774'],
      ['05-09', '932'],
      ['10-14', '869'],
    ]

    const inferred = inferSmartConfig(grid)

    expect(inferred.category).toBe(0) // altersklasse
    expect(inferred.values).toEqual([1]) // anzahl
  })
})
