export function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(+d)
}

/**
 * Format a date as the `YYYY-MM-DD` value of a native date input (local time).
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date as the `HH:MM` value of a native time input (local time).
 */
export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Parse the `HH:MM` value of a native time input.
 *
 * Returns null for anything that is not a valid time, including the empty
 * string a cleared time input produces.
 */
export function parseTime(
  value: string,
): { hours: number; minutes: number } | null {
  const match = /^(\d{2}):(\d{2})/.exec(value)
  if (!match) {
    return null
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    return null
  }
  return { hours, minutes }
}

/**
 * Combine a native date input value (`YYYY-MM-DD`) and a native time input
 * value (`HH:MM`) into a Date in local time.
 *
 * Returns null if either part is missing or the combination is not a valid
 * date.
 */
export function composeLocalDateTime(
  dateValue: string,
  timeValue: string,
): Date | null {
  if (!dateValue || !parseTime(timeValue)) {
    return null
  }
  const date = new Date(`${dateValue}T${timeValue}:00`)
  return isValidDate(date) ? date : null
}
