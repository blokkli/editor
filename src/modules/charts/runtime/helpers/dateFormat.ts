import type { ChartDateFormat, ChartDateFormatStyle } from '../types'

export type DateSourceFormat =
  | 'mm/yyyy'
  | 'yyyy-mm'
  | 'yyyy-mm-dd'
  | 'dd.mm.yyyy'

export type DateGranularity = 'month' | 'day'

export type DetectedDateSource = {
  format: DateSourceFormat
  granularity: DateGranularity
}

const SOURCE_PATTERNS: { format: DateSourceFormat; regex: RegExp }[] = [
  { format: 'yyyy-mm-dd', regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/ },
  { format: 'dd.mm.yyyy', regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/ },
  { format: 'mm/yyyy', regex: /^(\d{1,2})\/(\d{4})$/ },
  { format: 'yyyy-mm', regex: /^(\d{4})-(\d{1,2})$/ },
]

const GRANULARITY: Record<DateSourceFormat, DateGranularity> = {
  'mm/yyyy': 'month',
  'yyyy-mm': 'month',
  'yyyy-mm-dd': 'day',
  'dd.mm.yyyy': 'day',
}

function isValidYMD(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}

function matchSource(
  value: string,
): { source: DetectedDateSource; date: Date } | null {
  for (const { format, regex } of SOURCE_PATTERNS) {
    const m = value.match(regex)
    if (!m) continue
    let year = 0
    let month = 0
    let day = 1
    if (format === 'yyyy-mm-dd') {
      year = Number(m[1])
      month = Number(m[2])
      day = Number(m[3])
    } else if (format === 'dd.mm.yyyy') {
      day = Number(m[1])
      month = Number(m[2])
      year = Number(m[3])
    } else if (format === 'mm/yyyy') {
      month = Number(m[1])
      year = Number(m[2])
    } else if (format === 'yyyy-mm') {
      year = Number(m[1])
      month = Number(m[2])
    }
    if (!isValidYMD(year, month, day)) continue
    return {
      source: { format, granularity: GRANULARITY[format] },
      date: new Date(Date.UTC(year, month - 1, day)),
    }
  }
  return null
}

/**
 * Detect a single shared source date format across all non-empty categories.
 * Returns `null` if any category fails to match the format picked from the
 * first non-empty entry.
 */
export function detectDateFormat(
  categories: string[],
): DetectedDateSource | null {
  let detected: DetectedDateSource | null = null
  for (const raw of categories) {
    const value = raw.trim()
    if (!value) continue
    const match = matchSource(value)
    if (!match) return null
    if (!detected) {
      detected = match.source
    } else if (match.source.format !== detected.format) {
      return null
    }
  }
  return detected
}

export function parseDateCategory(
  value: string,
  source: DetectedDateSource,
): Date | null {
  const match = matchSource(value.trim())
  if (!match) return null
  if (match.source.format !== source.format) return null
  return match.date
}

function createIntl(
  locale: string | undefined,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(locale || undefined, opts)
  } catch {
    return new Intl.DateTimeFormat(undefined, opts)
  }
}

export function defaultStyleFor(
  granularity: DateGranularity,
): ChartDateFormatStyle {
  return granularity === 'day' ? 'dateShort' : 'monthYearShort'
}

function intlOptionsFor(
  style: ChartDateFormatStyle,
  granularity: DateGranularity,
): Intl.DateTimeFormatOptions | null {
  const effective: ChartDateFormatStyle =
    style === 'auto' ? defaultStyleFor(granularity) : style
  switch (effective) {
    case 'monthYearShort':
      return { year: 'numeric', month: 'short' }
    case 'monthYearLong':
      return { year: 'numeric', month: 'long' }
    case 'monthOnly':
      return { month: 'long' }
    case 'monthYearNumeric':
      return { year: 'numeric', month: 'numeric' }
    case 'dateShort':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'dateLong':
      return { year: 'numeric', month: 'long', day: 'numeric' }
    case 'yearOnly':
      return { year: 'numeric' }
    case 'iso':
    case 'none':
    case 'auto':
      return null
  }
}

function formatIso(date: Date, granularity: DateGranularity): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  if (granularity === 'month') return `${y}-${m}`
  const d = date.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Format a single category string. Returns the original string if it does not
 * match the source format, so partially-bad data still renders something.
 */
export function formatDateCategory(
  value: string,
  source: DetectedDateSource,
  format: ChartDateFormat | undefined,
  locale: string | undefined,
): string {
  const style: ChartDateFormatStyle = format?.style ?? 'auto'
  if (style === 'none') return value
  const date = parseDateCategory(value, source)
  if (!date) return value
  const effective: ChartDateFormatStyle =
    style === 'auto' ? defaultStyleFor(source.granularity) : style
  if (effective === 'iso') {
    return formatIso(date, source.granularity)
  }
  const opts = intlOptionsFor(effective, source.granularity)
  if (!opts) return value
  return createIntl(locale, { ...opts, timeZone: 'UTC' }).format(date)
}
