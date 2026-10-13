/**
 * The format of every date that Drupal sends: ISO 8601 in UTC with
 * milliseconds, as `Date.prototype.toISOString()` writes it.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

/**
 * Whether a value is a date in Drupal's format that is at most `seconds` away
 * from now: what a date of something that just happened looks like.
 */
export function isRecentIsoDate(value: string | null, seconds = 120): boolean {
  if (!value || !ISO_DATE.test(value)) {
    return false
  }
  return Math.abs(Date.now() - new Date(value).getTime()) < seconds * 1000
}
