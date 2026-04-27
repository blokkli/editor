import type { ChartNumberFormat } from '../types'

function createIntl(
  locale: string | undefined,
  opts: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale || undefined, opts)
  } catch {
    return new Intl.NumberFormat(undefined, opts)
  }
}

/**
 * Build a value formatter for chart axes, data labels and tooltips. Wraps
 * `Intl.NumberFormat` with locale, decimals, notation and adds optional
 * prefix/suffix (currency symbol, units).
 */
export function createNumberFormatter(
  format: ChartNumberFormat | undefined,
): (value: number) => string {
  const opts: Intl.NumberFormatOptions = {}
  if (format?.notation) {
    opts.notation = format.notation
  }
  if (format?.decimals !== undefined) {
    opts.minimumFractionDigits = format.decimals
    opts.maximumFractionDigits = format.decimals
  } else if (format?.notation === 'compact') {
    opts.maximumFractionDigits = 1
  }
  const fmt = createIntl(format?.locale, opts)
  const prefix = format?.prefix ?? ''
  const suffix = format?.suffix ?? ''
  return (value: number) =>
    Number.isFinite(value) ? `${prefix}${fmt.format(value)}${suffix}` : ''
}

/**
 * Build a percentage formatter for pie/donut data labels. ApexCharts feeds
 * those formatters the slice share (0-100), not the raw value, so currency
 * prefix/suffix and notation don't apply — only locale and decimals do.
 */
export function createPercentFormatter(
  format: ChartNumberFormat | undefined,
): (value: number) => string {
  const decimals = format?.decimals ?? 1
  const fmt = createIntl(format?.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (value: number) =>
    Number.isFinite(value) ? `${fmt.format(value)}%` : ''
}
