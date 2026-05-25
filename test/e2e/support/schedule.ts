import type { Locator, Page } from 'playwright-core'

/**
 * Helpers for the `ScheduleDate` widget (`components/ScheduleDate/index.vue`) —
 * the date + time picker shared by the publish dialog and the block-scheduler
 * dialog. Each helper takes an optional `within` scope: the block-scheduler
 * dialog renders one `ScheduleDate` per section (publish / unpublish), so pass
 * that section's Locator to disambiguate; the publish dialog has a single widget
 * at page level, so `within` is omitted there.
 */

/** Resolve the search root: a section Locator if scoped, else the whole page. */
function base(page: Page, within?: Locator): Page | Locator {
  return within ?? page
}

/** The widget root (`data-test="schedule-date"`) — for visibility assertions. */
export function scheduleDate(page: Page, within?: Locator): Locator {
  return base(page, within).locator('[data-test="schedule-date"]')
}

/** The native time input (`data-test="schedule-time"`). */
export function scheduleTime(page: Page, within?: Locator): Locator {
  return base(page, within).locator('[data-test="schedule-time"]')
}

/** The "date must be in the future" error box (`data-test="schedule-error"`). */
export function scheduleError(page: Page, within?: Locator): Locator {
  return base(page, within).locator('[data-test="schedule-error"]')
}

/**
 * Pick a day in the datepicker by its `YYYY-MM-DD` date string
 * (`data-test="datepicker-day-<date>"`).
 */
export function pickScheduleDay(
  page: Page,
  date: string,
  within?: Locator,
): Promise<void> {
  return base(page, within)
    .locator(`[data-test="datepicker-day-${date}"]`)
    .click()
}

/** Set the time via the native time input (`HH:MM`, e.g. `09:00`). */
export function setScheduleTime(
  page: Page,
  time: string,
  within?: Locator,
): Promise<void> {
  return scheduleTime(page, within).fill(time)
}
