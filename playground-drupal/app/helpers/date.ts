// The site's timezone (system.date). Set explicitly, so that the server and
// the browser format the same.
const TIME_ZONE = 'Europe/Zurich'

/**
 * A date from a Unix timestamp as a string, e.g. a node's `created`.
 */
export function formatTimestamp(timestamp: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date(Number(timestamp) * 1000))
}

/**
 * A date range from ISO 8601 dates with an offset, as a date range field's
 * `startDate(format: "c")` and `endDate(format: "c")` return them. The raw
 * `value` has no offset.
 */
export function formatDateRange(
  start: string,
  end: string,
  language: string,
): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).formatRange(new Date(start), new Date(end))
}
