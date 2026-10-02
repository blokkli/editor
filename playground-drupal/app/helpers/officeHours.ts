import type { OfficeDetailsFragment } from '#graphql-operations'

// Times are stored as numbers, e.g. 830 for 08:30.
function formatTime(value: number): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${pad(Math.floor(value / 100))}:${pad(value % 100)}`
}

/**
 * An office's hours on one day (office_hours numbers the days from 0, Sunday),
 * in order, e.g. ["08:00–12:00", "13:30–17:00"]. Empty when it's closed.
 */
export function hoursOfDay(
  hours: OfficeDetailsFragment['hours'],
  day: number,
): string[] {
  return (hours ?? [])
    .filter(
      (slot) =>
        slot?.day === day && slot.starthours != null && slot.endhours != null,
    )
    .sort((a, b) => (a?.starthours ?? 0) - (b?.starthours ?? 0))
    .map(
      (slot) =>
        `${formatTime(slot?.starthours ?? 0)}–${formatTime(slot?.endhours ?? 0)}`,
    )
}

/**
 * A weekday's name in the language, from office_hours' number (0 is Sunday).
 */
export function weekdayName(day: number, language: string): string {
  // 4 January 1970 was a Sunday.
  return new Intl.DateTimeFormat(language, {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(1970, 0, 4 + day)))
}
