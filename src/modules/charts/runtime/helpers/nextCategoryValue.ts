/**
 * Detect a deterministic series in `categories` and return the next value.
 *
 * Conservative: any ambiguity (mixed formats, fewer than 2 entries, no constant
 * step, non-monotonic) falls back to `Category N+1`. Wrong guesses are worse
 * than no guess.
 *
 * Footnote markers (`{1}`, `{2}`, …) are stripped before detection, since they
 * are display-only annotations and the raw category drives the pattern.
 *
 * Detector order — most specific first, generic last:
 *   1. `MM/YYYY` — month/year with year carry-over
 *   2. `YYYY-MM` — ISO-ish year-month
 *   3. Month names in en/de/fr/it (with cyclic wrap-around)
 *   4. Integer arithmetic progression (any constant step ≠ 0)
 *
 * Returns a single string suitable for the new category cell.
 */
export function nextCategoryValue(categories: string[]): string {
  const fallback = `Category ${categories.length + 1}`

  if (categories.length < 2) {
    return fallback
  }

  const cleaned = categories.map(stripFootnotes)

  return (
    detectMonthYear(cleaned) ??
    detectYearMonth(cleaned) ??
    detectMonthName(cleaned) ??
    detectInteger(cleaned) ??
    fallback
  )
}

/**
 * Remove footnote markers (e.g. `{1}`, `{2}`) — categories may contain
 * multiple of them anywhere in the string.
 */
function stripFootnotes(value: string): string {
  return value.replace(/\{\d\}/g, '')
}

/**
 * Compute a constant step across all consecutive pairs of `values`. Returns
 * `null` if any pair disagrees, the step is 0, or the values aren't monotonic.
 */
function constantStep(values: number[]): number | null {
  if (values.length < 2) return null
  const step = values[1]! - values[0]!
  if (step === 0) return null
  for (let i = 2; i < values.length; i++) {
    if (values[i]! - values[i - 1]! !== step) return null
  }
  return step
}

function detectInteger(categories: string[]): string | null {
  const values: number[] = []
  for (const c of categories) {
    const trimmed = c.trim()
    if (!/^-?\d+$/.test(trimmed)) return null
    values.push(Number(trimmed))
  }
  const step = constantStep(values)
  if (step === null) return null
  return String(values[values.length - 1]! + step)
}

const MONTH_YEAR_RE = /^(\d{1,2})\/(\d{4})$/

function detectMonthYear(categories: string[]): string | null {
  const totals: number[] = []
  for (const c of categories) {
    const match = c.trim().match(MONTH_YEAR_RE)
    if (!match) return null
    const month = Number(match[1])
    const year = Number(match[2])
    if (month < 1 || month > 12) return null
    totals.push(year * 12 + (month - 1))
  }
  const step = constantStep(totals)
  if (step === null) return null
  const next = totals[totals.length - 1]! + step
  const nextYear = Math.floor(next / 12)
  const nextMonth = (next % 12) + 1
  return `${String(nextMonth).padStart(2, '0')}/${nextYear}`
}

const MONTH_NAMES: Record<string, string[]> = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  de: [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
  ],
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
  it: [
    'gennaio',
    'febbraio',
    'marzo',
    'aprile',
    'maggio',
    'giugno',
    'luglio',
    'agosto',
    'settembre',
    'ottobre',
    'novembre',
    'dicembre',
  ],
}

/**
 * Detect a series of month names from a single locale and extrapolate the
 * next month, wrapping around December → January.
 */
function detectMonthName(categories: string[]): string | null {
  const lowered = categories.map((c) => c.trim().toLowerCase())
  if (lowered.some((v) => !v)) return null

  for (const locale of Object.keys(MONTH_NAMES)) {
    const names = MONTH_NAMES[locale]!
    const lowerNames = names.map((n) => n.toLowerCase())
    const indices: number[] = []
    let matched = true
    for (const v of lowered) {
      const idx = lowerNames.indexOf(v)
      if (idx === -1) {
        matched = false
        break
      }
      indices.push(idx)
    }
    if (!matched) continue
    const step = cyclicStep(indices, 12)
    if (step === null) continue
    const last = indices[indices.length - 1]!
    const next = (((last + step) % 12) + 12) % 12
    return names[next]!
  }

  return null
}

/**
 * Detect a constant step on a cyclic domain (e.g. months 0..11). Steps are
 * normalised mod `cycle`, so `[Nov, Dec, Jan]` parses as step 1 and
 * `[Mar, Feb, Jan]` as step 11 (i.e. -1). Step 0 is rejected (no progression).
 */
function cyclicStep(values: number[], cycle: number): number | null {
  if (values.length < 2) return null
  const first = (((values[1]! - values[0]!) % cycle) + cycle) % cycle
  if (first === 0) return null
  for (let i = 2; i < values.length; i++) {
    const s = (((values[i]! - values[i - 1]!) % cycle) + cycle) % cycle
    if (s !== first) return null
  }
  return first
}

const YEAR_MONTH_RE = /^(\d{4})-(\d{1,2})$/

function detectYearMonth(categories: string[]): string | null {
  const totals: number[] = []
  for (const c of categories) {
    const match = c.trim().match(YEAR_MONTH_RE)
    if (!match) return null
    const year = Number(match[1])
    const month = Number(match[2])
    if (month < 1 || month > 12) return null
    totals.push(year * 12 + (month - 1))
  }
  const step = constantStep(totals)
  if (step === null) return null
  const next = totals[totals.length - 1]! + step
  const nextYear = Math.floor(next / 12)
  const nextMonth = (next % 12) + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}
