import type { DateRangeFragment } from '#graphql-operations'

/**
 * A date range from the parts Drupal formats in the page's language: one day
 * with two times, or two days.
 */
export function formatDateRange(date: DateRangeFragment): string {
  if (date.startDay === date.endDay) {
    return `${date.startDay}, ${date.startTime}–${date.endTime}`
  }
  return `${date.startDay}, ${date.startTime} – ${date.endDay}, ${date.endTime}`
}
