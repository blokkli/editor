import type { ColorOption } from '#blokkli/editor/types/config'
import type { ChartSeries } from '../../../../types'
import { getColorIdAtIndex, parseNumericInput } from '../../../../helpers'

export type CsvGrid = string[][]

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

  // Pad rows to a consistent column count so downstream transforms can rely on
  // a rectangular grid.
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
 * Reverse the series columns (everything except the first column, which holds
 * the category labels).
 */
export function reverseSeriesColumns(grid: CsvGrid): CsvGrid {
  if (grid.length === 0) return grid
  return grid.map((row) => {
    if (row.length < 2) return row
    const [first, ...rest] = row
    return [first!, ...rest.reverse()]
  })
}

/**
 * Keep only the series columns at the given indices (0-based, relative to the
 * series columns — i.e. ignoring the leading category column). The category
 * column is always preserved.
 */
export function selectSeriesColumns(
  grid: CsvGrid,
  includedSeriesIndices: number[],
): CsvGrid {
  if (grid.length === 0) return grid
  const ordered = [...includedSeriesIndices].sort((a, b) => a - b)
  return grid.map((row) => {
    const out: string[] = [row[0] ?? '']
    for (const i of ordered) {
      out.push(row[i + 1] ?? '')
    }
    return out
  })
}

export function gridToImportPayload(
  grid: CsvGrid,
  colorOptions: ColorOption[],
): CsvImportPayload {
  const header = grid[0] ?? []
  const seriesNames = header.slice(1)

  const categories: string[] = []
  const seriesData: number[][] = seriesNames.map(() => [])

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i]!
    categories.push(cells[0] || `Category ${i}`)
    for (let si = 0; si < seriesNames.length; si++) {
      seriesData[si]!.push(parseNumericInput(cells[si + 1] || ''))
    }
  }

  const series: ChartSeries[] = seriesNames.map((name, i) => ({
    name: name || `Series ${i + 1}`,
    color: getColorIdAtIndex(i, colorOptions),
    data: seriesData[i]!,
  }))

  const categoryColors = categories.map((_, i) =>
    getColorIdAtIndex(i, colorOptions),
  )

  return { categories, series, categoryColors }
}
