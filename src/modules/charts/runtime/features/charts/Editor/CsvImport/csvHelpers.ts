import type { ColorOption } from '#blokkli/editor/types/config'
import type { ChartSeries } from '../../../../types'
import { getColorIdAtIndex, parseNumericInput } from '../../../../helpers'

export type CsvGrid = string[][]

export type ColumnRole =
  | 'category'
  | 'series'
  | 'value'
  | 'groupBy'
  | 'ignore'

export type CategorySort = 'firstOccurrence' | 'alphabetical' | 'numeric'

export interface CsvImportFilter {
  /** Index of the column the filter applies to. */
  column: number
  /** Allowed values. A row is kept only if its cell is in this set. */
  values: string[]
}

export interface CsvImportConfig {
  /** One entry per column in the (possibly transposed) grid. */
  roles: ColumnRole[]
  /**
   * Independent filters. Each filter restricts rows to those whose cell in
   * the named column matches one of `values`. Filters are AND-combined.
   */
  filters: CsvImportFilter[]
  sort: CategorySort
  /** Joins values across `groupBy` columns into a single series name. */
  groupBySeparator: string
}

export interface CsvImportPayload {
  categories: string[]
  series: ChartSeries[]
  categoryColors: string[]
}

export function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',' || char === ';' || char === '\t') {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

export function parseCsvText(text: string): CsvGrid {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const grid = lines.map((line) => parseCsvLine(line))

  // Pad rows to a consistent column count so downstream transforms can rely
  // on a rectangular grid.
  const cols = grid.reduce((max, row) => Math.max(max, row.length), 0)
  return grid.map((row) => {
    if (row.length === cols) return row
    const padded = row.slice()
    while (padded.length < cols) padded.push('')
    return padded
  })
}

export function transposeGrid(grid: CsvGrid): CsvGrid {
  if (grid.length === 0) return []
  const rows = grid.length
  const cols = grid[0]!.length
  const out: CsvGrid = []
  for (let c = 0; c < cols; c++) {
    const newRow: string[] = []
    for (let r = 0; r < rows; r++) {
      newRow.push(grid[r]![c] ?? '')
    }
    out.push(newRow)
  }
  return out
}

/**
 * Reverse data rows while keeping the header row at the top.
 */
export function reverseRowsKeepingHeader(grid: CsvGrid): CsvGrid {
  if (grid.length < 2) return grid
  const [header, ...rest] = grid
  return [header!, ...rest.reverse()]
}

/**
 * Heuristic for whether a column's data cells (rows 1..N) are mostly numeric.
 * A column counts as numeric when ≥ 80 % of its non-empty cells parse as a
 * finite number. Used to pick a sensible default role.
 */
export function isMostlyNumeric(grid: CsvGrid, colIdx: number): boolean {
  let nonEmpty = 0
  let numeric = 0
  for (let r = 1; r < grid.length; r++) {
    const cell = grid[r]?.[colIdx] ?? ''
    if (cell === '') continue
    nonEmpty++
    // parseNumericInput returns 0 for non-numeric input, so use a separate test
    // that distinguishes "actually parsed a number" from "fallback 0".
    if (looksNumeric(cell)) numeric++
  }
  if (nonEmpty === 0) return false
  return numeric / nonEmpty >= 0.8
}

function looksNumeric(s: string): boolean {
  if (!s) return false
  // Whole string (after stripping thousand-separator apostrophes and
  // accepting comma-as-decimal) must parse as a number — `parseFloat` alone
  // happily accepts "00-04" (age range), "2025-12-31" (date) etc. by returning
  // the leading digits and ignoring the rest. Anchor the regex to reject those.
  const candidates = [
    s.replace(/'/g, ''),
    s.replace(/'/g, '').replace(/\./g, '').replace(',', '.'),
  ]
  for (const c of candidates) {
    if (c === '') continue
    if (!/^-?\d+(?:\.\d+)?$/.test(c)) continue
    if (Number.isFinite(parseFloat(c))) return true
  }
  return false
}

interface ColumnTraits {
  index: number
  name: string
  distinct: number
  isConstant: boolean
  isAllNumeric: boolean
  isYearLike: boolean
  isDateLike: boolean
  isBooleanLike: boolean
  isIdNamed: boolean
  isGeoNamed: boolean
  isMeasureNamed: boolean
  values: string[] // distinct values in first-occurrence order
}

const BOOLEAN_TOKENS = new Set([
  'true',
  'false',
  '0',
  '1',
  'yes',
  'no',
  't',
  'f',
])

function isDateLikeCell(s: string): boolean {
  return (
    /^\d{4}-\d{1,2}-\d{1,2}/.test(s) ||
    /^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(s)
  )
}

// Columns whose name marks them as a row identifier (e.g. `id`, `*_id`,
// `id_*`, `*_nr`, `uuid`). Even when all-numeric, these are not measures.
function isIdNamedColumn(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return false
  if (n === 'id' || n === 'uuid' || n === 'guid' || n === 'pk') return true
  if (/^id[_-]/.test(n)) return true
  if (/[_-]id$/.test(n)) return true
  if (/[_-]nr$/.test(n)) return true
  if (/[_-]uuid$/.test(n)) return true
  return false
}

// Geocoordinate columns. They're numeric but not chart-worthy as values.
function isGeoNamedColumn(name: string): boolean {
  const n = name.trim().toLowerCase()
  return (
    n === 'lat' ||
    n === 'latitude' ||
    n === 'lon' ||
    n === 'lng' ||
    n === 'longitude' ||
    n === 'breitengrad' ||
    n === 'längengrad' ||
    n === 'laengengrad'
  )
}

// Columns whose name reads like a count / total / measure. When at least one
// of these is present in the CSV, the inference uses only these as Values
// and ignores other numeric columns — they're far more likely to be the
// quantity the user wants charted.
function isMeasureNamedColumn(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (!n) return false
  const tokens = [
    'anzahl',
    'besuche',
    'count',
    'total',
    'sum',
    'summe',
    'wert',
    'value',
    'amount',
    'betrag',
    'menge',
    'umsatz',
    'einnahmen',
    'ausgaben',
    'kosten',
    'preis',
    'price',
  ]
  return tokens.some((t) => n === t || n.includes(t))
}

function analyzeColumn(grid: CsvGrid, colIdx: number): ColumnTraits {
  const seen = new Set<string>()
  const values: string[] = []
  let nonEmpty = 0
  let allNumeric = true
  let allBoolean = true
  let allDate = true
  let allYear = true

  for (let r = 1; r < grid.length; r++) {
    const cell = grid[r]?.[colIdx] ?? ''
    if (cell === '') continue
    nonEmpty++
    if (!seen.has(cell)) {
      seen.add(cell)
      values.push(cell)
    }
    if (allNumeric && !looksNumeric(cell)) allNumeric = false
    if (allBoolean && !BOOLEAN_TOKENS.has(cell.toLowerCase())) {
      allBoolean = false
    }
    if (allDate && !isDateLikeCell(cell)) allDate = false
    if (allYear) {
      const n = Number(cell)
      if (
        !Number.isInteger(n) ||
        n < 1900 ||
        n > 2100 ||
        !/^\d{4}$/.test(cell)
      ) {
        allYear = false
      }
    }
  }

  const distinct = values.length
  const name = grid[0]?.[colIdx] ?? ''
  return {
    index: colIdx,
    name,
    distinct,
    isConstant: distinct === 1,
    isAllNumeric: nonEmpty > 0 && allNumeric,
    isYearLike: nonEmpty > 0 && allYear && distinct > 1,
    isDateLike: nonEmpty > 0 && allDate,
    isBooleanLike: nonEmpty > 0 && allBoolean,
    isIdNamed: isIdNamedColumn(name),
    isGeoNamed: isGeoNamedColumn(name),
    isMeasureNamed: isMeasureNamedColumn(name),
    values,
  }
}

/**
 * Infer a sensible default configuration for the CSV.
 *
 * Wide CSVs (e.g. `[month, sales, costs]`) land with category = first
 * column, values = the rest. Long / tidy CSVs (one numeric column +
 * categorical dimensions) get the highest-cardinality categorical as
 * category, the numeric measure as the single value, low-cardinality
 * categoricals as group-by, and year-like dimensions pinned to their
 * latest value via filters.
 */
export function inferSmartConfig(grid: CsvGrid): {
  category: number
  values: number[]
  groupBy: number[]
  filters: CsvImportFilter[]
} {
  const header = grid[0] ?? []
  if (header.length === 0) {
    return { category: 0, values: [], groupBy: [], filters: [] }
  }

  const traits = header.map((_, i) => analyzeColumn(grid, i))

  // Disqualify constants, booleans, and full-date columns from all roles.
  // ID and geo columns are also pulled out — they're often numeric but never
  // a meaningful measure or grouping for a chart.
  const usable = traits.filter(
    (c) =>
      !c.isConstant &&
      !c.isBooleanLike &&
      !c.isDateLike &&
      !c.isIdNamed &&
      !c.isGeoNamed,
  )

  const categoricals = usable.filter(
    (c) => !c.isAllNumeric && !c.isYearLike,
  )
  const yearCols = usable.filter((c) => c.isYearLike)
  let measures = usable.filter((c) => c.isAllNumeric && !c.isYearLike)

  // When the CSV has a column whose *name* reads like a count / total
  // (`besuche`, `anzahl`, `count`, …), use only those as Values. Other
  // numeric columns are far more likely to be metadata (rank, score column,
  // some derived ratio) the user doesn't want plotted.
  const namedMeasures = measures.filter((c) => c.isMeasureNamed)
  if (namedMeasures.length > 0) {
    measures = namedMeasures
  }

  // Category: highest-cardinality categorical, else first year column,
  // else the first column (so a CSV of only numbers still has *something*
  // selectable — the user can correct it).
  let category: number
  if (categoricals.length > 0) {
    category = categoricals.reduce((best, c) =>
      c.distinct > best.distinct ? c : best,
    ).index
  } else if (yearCols.length > 0) {
    category = yearCols[0]!.index
  } else {
    category = 0
  }

  const values = measures
    .map((c) => c.index)
    .filter((i) => i !== category)

  const groupBy = categoricals
    .filter(
      (c) => c.index !== category && c.distinct >= 2 && c.distinct <= 50,
    )
    .map((c) => c.index)

  const filters: CsvImportFilter[] = yearCols
    .filter((c) => c.index !== category)
    .map((c) => ({
      column: c.index,
      // Years are integers; the lexicographic max is also the numeric max.
      values: [[...c.values].sort()[c.values.length - 1]!],
    }))

  return { category, values, groupBy, filters }
}

/**
 * Build a "header (val1, val2, val3)" label for a column. Used in
 * select/checkbox option labels so the user can tell columns apart even
 * when the header alone is opaque (`heimat`, `typ`, `id_pro_typ`).
 */
export function columnLabelWithSample(
  grid: CsvGrid,
  colIdx: number,
  maxValues = 3,
  maxValueLen = 24,
): string {
  const name = grid[0]?.[colIdx] || `Column ${colIdx + 1}`
  const distinct = distinctColumnValues(grid, colIdx)
  if (distinct.length === 0) return name
  const sample = distinct
    .slice(0, maxValues)
    .map((v) =>
      v.length > maxValueLen ? `${v.slice(0, maxValueLen - 1)}…` : v,
    )
  return `${name} (${sample.join(', ')})`
}

/**
 * Distinct non-empty values in a column (rows 1..N), ordered by first
 * occurrence. Used to populate the filter multi-select for filter columns.
 */
export function distinctColumnValues(grid: CsvGrid, colIdx: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (let r = 1; r < grid.length; r++) {
    const v = grid[r]?.[colIdx] ?? ''
    if (v === '' || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function sortCategories(categories: string[], mode: CategorySort): string[] {
  if (mode === 'firstOccurrence') return categories
  const arr = [...categories]
  if (mode === 'alphabetical') {
    arr.sort((a, b) => a.localeCompare(b))
    return arr
  }
  // Numeric, best-effort: extract leading number from each label and compare.
  // Falls back to localeCompare for ties or non-numeric labels.
  arr.sort((a, b) => {
    const na = parseFloat(a)
    const nb = parseFloat(b)
    const aNum = Number.isFinite(na)
    const bNum = Number.isFinite(nb)
    if (aNum && bNum && na !== nb) return na - nb
    if (aNum && !bNum) return -1
    if (!aNum && bNum) return 1
    return a.localeCompare(b)
  })
  return arr
}

export function gridToImportPayload(
  grid: CsvGrid,
  config: CsvImportConfig,
  colorOptions: ColorOption[],
): CsvImportPayload {
  const header = grid[0] ?? []
  const dataRows = grid.slice(1)

  // Collect column indices by role.
  const categoryCol = config.roles.indexOf('category')
  const valueCol = config.roles.indexOf('value')
  const seriesCols: number[] = []
  const groupByCols: number[] = []
  for (let i = 0; i < config.roles.length; i++) {
    const role = config.roles[i]
    if (role === 'series') seriesCols.push(i)
    else if (role === 'groupBy') groupByCols.push(i)
  }

  if (categoryCol < 0) {
    return { categories: [], series: [], categoryColors: [] }
  }

  // Pre-build filter Sets for O(1) lookup. A filter with no values is a
  // no-op (pass everything through).
  const activeFilters: { col: number; allowed: Set<string> }[] = []
  for (const f of config.filters) {
    if (f.values.length > 0) {
      activeFilters.push({ col: f.column, allowed: new Set(f.values) })
    }
  }

  // Apply row filters.
  const kept: string[][] = []
  for (const row of dataRows) {
    let pass = true
    for (const f of activeFilters) {
      if (!f.allowed.has(row[f.col] ?? '')) {
        pass = false
        break
      }
    }
    if (pass) kept.push(row)
  }

  // Track category order by first occurrence (later sorted per config).
  const categoryOrder: string[] = []
  const categoryIndex = new Map<string, number>()
  function registerCategory(label: string): number {
    let idx = categoryIndex.get(label)
    if (idx === undefined) {
      idx = categoryOrder.length
      categoryIndex.set(label, idx)
      categoryOrder.push(label)
    }
    return idx
  }

  const seriesOrder: string[] = []
  const seriesIndex = new Map<string, number>()
  function registerSeries(name: string): number {
    let idx = seriesIndex.get(name)
    if (idx === undefined) {
      idx = seriesOrder.length
      seriesIndex.set(name, idx)
      seriesOrder.push(name)
    }
    return idx
  }

  // Accumulate values into a sparse [seriesIdx][categoryIdx] map. Missing
  // combinations stay undefined and surface as 0 in the final dense matrix.
  const values: Map<number, Map<number, number>> = new Map()
  function add(sIdx: number, cIdx: number, v: number) {
    let row = values.get(sIdx)
    if (!row) {
      row = new Map()
      values.set(sIdx, row)
    }
    row.set(cIdx, (row.get(cIdx) ?? 0) + v)
  }

  if (valueCol >= 0) {
    // Long / pivot mode.
    for (const row of kept) {
      const catLabel = row[categoryCol] || ''
      if (catLabel === '') continue
      const cIdx = registerCategory(catLabel)
      const seriesName =
        groupByCols.length > 0
          ? groupByCols
              .map((c) => row[c] ?? '')
              .join(config.groupBySeparator)
          : header[valueCol] || 'Value'
      const sIdx = registerSeries(seriesName)
      const v = parseNumericInput(row[valueCol] ?? '')
      add(sIdx, cIdx, v)
    }
  } else {
    // Wide mode: each `series` column is a series, header is its name.
    for (const sCol of seriesCols) {
      registerSeries(header[sCol] || `Series ${seriesOrder.length + 1}`)
    }
    for (const row of kept) {
      const catLabel = row[categoryCol] || ''
      if (catLabel === '') continue
      const cIdx = registerCategory(catLabel)
      for (let si = 0; si < seriesCols.length; si++) {
        const sCol = seriesCols[si]!
        const v = parseNumericInput(row[sCol] ?? '')
        add(si, cIdx, v)
      }
    }
  }

  // Apply category sort. Map series rows from old → new category indices.
  const sortedCategories = sortCategories(categoryOrder, config.sort)
  const oldToNew = new Map<number, number>()
  for (let i = 0; i < sortedCategories.length; i++) {
    const oldIdx = categoryIndex.get(sortedCategories[i]!)
    if (oldIdx !== undefined) oldToNew.set(oldIdx, i)
  }

  const categoryCount = sortedCategories.length
  const series: ChartSeries[] = seriesOrder.map((name, si) => {
    const row = values.get(si)
    const data: number[] = new Array(categoryCount).fill(0)
    if (row) {
      for (const [oldIdx, v] of row) {
        const newIdx = oldToNew.get(oldIdx)
        if (newIdx !== undefined) data[newIdx] = v
      }
    }
    return {
      name,
      color: getColorIdAtIndex(si, colorOptions),
      data,
    }
  })

  const categoryColors = sortedCategories.map((_, i) =>
    getColorIdAtIndex(i, colorOptions),
  )

  return { categories: sortedCategories, series, categoryColors }
}
