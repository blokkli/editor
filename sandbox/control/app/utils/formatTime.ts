/**
 * A Unix timestamp for the admin page, in the browser's time zone; a dash
 * without one.
 */
export function formatTime(time: number | null): string {
  return time
    ? new Date(time * 1000).toLocaleString('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '–'
}
