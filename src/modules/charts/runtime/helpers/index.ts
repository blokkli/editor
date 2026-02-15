export function parseNumericInput(raw: string): number {
  let str = raw.trim()
  if (!str) return 0

  // Remove apostrophe thousands separators (e.g. 156'000).
  str = str.replace(/'/g, '')

  // Determine if comma is a decimal or thousands separator.
  // If comma is followed by exactly 3 digits (possibly repeated), treat as
  // thousands separator (e.g. 153,224,152). Otherwise treat as decimal
  // (e.g. 142,40).
  if (str.includes(',')) {
    const isThousandsSep = /,\d{3}(?:,\d{3})*$/.test(str)
    if (isThousandsSep) {
      str = str.replace(/,/g, '')
    } else {
      // Treat comma as decimal: remove any dots (thousands) and replace
      // the last comma with a dot.
      str = str.replace(/\./g, '')
      const lastComma = str.lastIndexOf(',')
      str = str.slice(0, lastComma) + '.' + str.slice(lastComma + 1)
    }
  }

  const value = Number.parseFloat(str)
  return Number.isFinite(value) ? value : 0
}
