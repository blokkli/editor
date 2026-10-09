import { setup, url } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from '../../../e2e/support/menu'
import {
  dialog,
  dialogSubmit,
  dismissMessages,
} from '../../../e2e/support/overlays'
import { addBlock } from '../../../e2e/support/blocks'
import {
  setFixedTime,
  waitForEditorReady,
  withApp,
} from '../../../e2e/support/session'
import { emitEvent } from '../../../e2e/support/events'
import {
  scheduleDate,
  scheduleTime,
  scheduleError,
  schedulePreview,
  scheduleHourDecrement,
  scheduleHourIncrement,
  isScheduleTimeInvalid,
  pickScheduleDay,
  setScheduleTime,
} from '../../../e2e/support/schedule'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// Two unpublished pages (content/nodes/draft.yml, announcement.yml).
const DRAFT_PATH = editorPath('/en/draft', 'draft')
const ANNOUNCEMENT_PATH = editorPath('/en/announcement', 'announcement')

/**
 * The publish dialog (the Drupal adapter implements `getPublishOptions`, so
 * the menu's Publish button opens the dialog rather than publishing directly).
 * Covers reaching the dialog, switching between its three modes, the
 * scheduler's future-date validation, and what Drupal stores.
 *
 * Selectors are `data-test` only (the DOM contract). The scheduler reads the
 * wall clock, so the relevant tests pin both the clock and the timezone: the
 * fixed instant below maps to local 15 June, 10:00, under `UTC`. A year from
 * now: Drupal only accepts schedules after its own time.
 */
const YEAR = new Date().getUTCFullYear() + 1
const NOW = new Date(Date.UTC(YEAR, 5, 15, 10)).toISOString()
const TODAY = NOW.slice(0, 10)

function publishMode(page: Page, mode: 'save' | 'immediate' | 'scheduled') {
  return page.locator(`[data-test="publish-mode-${mode}"]`)
}

/** Schedule `uuids` to be published on `date` (`pbSetParagraphSchedule`). */
function scheduleBlocksPublish(
  page: Page,
  uuids: string[],
  date: string,
): Promise<void> {
  return page.evaluate(
    async ({ uuids, date }) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.setBlockScheduleDate!(
          uuids.map((uuid) => ({ uuid, type: 'publish' as const, date })),
        ),
      )
    },
    { uuids, date },
  )
}

/** Whether a publish-mode option is the currently selected one. */
async function isModeChecked(mode: Locator): Promise<boolean> {
  return (await mode.getAttribute('data-test-checked')) === 'true'
}

/**
 * Close the editor's page after a publish (it leaves the editor), then open
 * the editor again: publishing deleted the edit state, so this shows what
 * Drupal stored.
 */
async function reopenAfterPublish(page: Page, path: string): Promise<void> {
  await page.waitForURL((u) => !u.searchParams.has('blokkliEditing'))
  await page.goto(url(path))
  await waitForEditorReady(page)
}

/**
 * Page lifecycle: two pages opened in parallel, each on an unpublished page
 * of its own (the edit state belongs to whoever opens it first).
 *
 * `defaultPage` (the page "Draft", no clock pinning) handles the
 * happy-path "opens", "mode toggle" tests plus the two `publish` submits
 * (save + immediate), which leave the editor and reopen it.
 *
 * `pinnedPage` (the page "Announcement") is opened with timezone `UTC` and the
 * clock pinned to `NOW` once in `beforeAll`. It serves the scheduler tests
 * (validation, clearing the time, the hour buttons, the scheduled-blocks
 * notice and the scheduled submit) — with the scheduled submit LAST. That test
 * submits `scheduleEditState` which sets the entity's `publishOn`, and the
 * publish dialog defaults to `scheduled` mode whenever `publishOn` is set;
 * running it last avoids polluting the earlier tests that assert `save` is
 * the initial mode.
 *
 * `afterEach` closes any open dialog/menu and dismisses success messages.
 */
describe('The publish dialog', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let defaultPage: Page
  let pinnedPage: Page

  /**
   * Open the publish dialog on an already-open editor `page`. Adds a block
   * to give the editor a pending mutation (Publish is disabled without one),
   * then opens the app menu and clicks the Publish button.
   */
  async function openPublishDialog(page: Page): Promise<void> {
    await addBlock(page, { fieldName: 'field_paragraphs' })
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[defaultPage, pinnedPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', DRAFT_PATH),
      openEditor(sandbox, 'Anna Keller', ANNOUNCEMENT_PATH, {
        timezoneId: 'UTC',
      }),
    ])
    await setFixedTime(pinnedPage, NOW)
  })

  afterAll(async () => {
    await Promise.all([defaultPage.close(), pinnedPage.close()])
  })

  async function cleanup(page: Page): Promise<void> {
    if (await dialog(page, 'publish').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'publish').waitFor({ state: 'hidden' })
    }
    if (await appMenu(page).isVisible()) {
      await closeAppMenu(page)
    }
    await dismissMessages(page)
  }

  afterEach(async () => {
    await Promise.all([cleanup(defaultPage), cleanup(pinnedPage)])
  })

  test('opens from the app menu', async () => {
    await openPublishDialog(defaultPage)
    expect(await dialog(defaultPage, 'publish').count()).toBe(1)
  })

  test('switching mode toggles the schedule UI', async () => {
    await openPublishDialog(defaultPage)
    const scheduleUi = scheduleDate(defaultPage)

    // The page is unpublished, so `save` is the initial mode and there's no
    // schedule UI.
    expect(await isModeChecked(publishMode(defaultPage, 'save'))).toBe(true)
    expect(await scheduleUi.isHidden()).toBe(true)

    // Scheduling reveals the date picker + time selector.
    await publishMode(defaultPage, 'scheduled').click()
    await expect
      .poll(() => isModeChecked(publishMode(defaultPage, 'scheduled')))
      .toBe(true)
    await scheduleUi.waitFor({ state: 'visible' })
    await scheduleTime(defaultPage).waitFor({ state: 'visible' })

    // Publishing immediately hides it again.
    await publishMode(defaultPage, 'immediate').click()
    await expect
      .poll(() => isModeChecked(publishMode(defaultPage, 'immediate')))
      .toBe(true)
    await scheduleUi.waitFor({ state: 'hidden' })
  })

  test('rejects a schedule in the past and accepts one in the future', async () => {
    await openPublishDialog(pinnedPage)

    await publishMode(pinnedPage, 'scheduled').click()
    await scheduleDate(pinnedPage).waitFor({ state: 'visible' })

    const error = scheduleError(pinnedPage)

    // Default schedule is tomorrow at noon — valid, so no error and submit is
    // enabled.
    await error.waitFor({ state: 'hidden' })
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(false)

    // Move it to today (10:00 now) at 08:00 — in the past, so it fails the
    // "must be in the future" rule: error shows, submit is blocked.
    await pickScheduleDay(pinnedPage, TODAY)
    await setScheduleTime(pinnedPage, '08:00')
    await error.waitFor({ state: 'visible' })
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(true)

    // Bump it to 11:00, comfortably in the future — the error clears and submit
    // is enabled again.
    await setScheduleTime(pinnedPage, '11:00')
    await error.waitFor({ state: 'hidden' })
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(false)
  })

  test('clearing the time keeps the dialog alive and blocks submit', async () => {
    await openPublishDialog(pinnedPage)

    await publishMode(pinnedPage, 'scheduled').click()
    await scheduleDate(pinnedPage).waitFor({ state: 'visible' })

    const preview = schedulePreview(pinnedPage)
    const time = scheduleTime(pinnedPage)

    // Start from a valid schedule: today at 11:00 (now is 10:00).
    await pickScheduleDay(pinnedPage, TODAY)
    await setScheduleTime(pinnedPage, '11:00')
    await expect.poll(() => preview.textContent()).toContain(String(YEAR))
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(false)

    // Clearing the native time input (what the Delete key does) used to throw
    // on `toISOString` and take the whole editor down. Now the dialog stays,
    // the input is flagged, the preview keeps its box (no layout shift) but
    // shows nothing, and submit is blocked without a "too soon" error.
    await setScheduleTime(pinnedPage, '')
    await expect.poll(() => isScheduleTimeInvalid(pinnedPage)).toBe(true)
    expect(await dialog(pinnedPage, 'publish').count()).toBe(1)
    expect(await preview.isVisible()).toBe(true)
    expect(((await preview.textContent()) ?? '').trim()).toBe('')
    expect(await scheduleError(pinnedPage).isHidden()).toBe(true)
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(true)

    // Typing a time again restores everything.
    await setScheduleTime(pinnedPage, '11:30')
    await expect.poll(() => isScheduleTimeInvalid(pinnedPage)).toBe(false)
    await expect.poll(() => preview.textContent()).toContain(String(YEAR))
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(false)
    expect(await time.inputValue()).toBe('11:30')
  })

  test('hour buttons step to full hours and recover from an empty time', async () => {
    await openPublishDialog(pinnedPage)

    await publishMode(pinnedPage, 'scheduled').click()
    await scheduleDate(pinnedPage).waitFor({ state: 'visible' })

    const time = scheduleTime(pinnedPage)
    const plus = scheduleHourIncrement(pinnedPage)
    const minus = scheduleHourDecrement(pinnedPage)

    await pickScheduleDay(pinnedPage, TODAY)

    // From a full hour both buttons step by exactly one hour.
    await setScheduleTime(pinnedPage, '11:00')
    await plus.click()
    await expect.poll(() => time.inputValue()).toBe('12:00')
    await minus.click()
    await expect.poll(() => time.inputValue()).toBe('11:00')

    // From a partial hour "-" first rounds down, "+" goes to the next hour.
    await setScheduleTime(pinnedPage, '11:30')
    await minus.click()
    await expect.poll(() => time.inputValue()).toBe('11:00')
    await setScheduleTime(pinnedPage, '11:30')
    await plus.click()
    await expect.poll(() => time.inputValue()).toBe('12:00')

    // Wraps around midnight in both directions.
    await setScheduleTime(pinnedPage, '23:00')
    await plus.click()
    await expect.poll(() => time.inputValue()).toBe('00:00')
    await minus.click()
    await expect.poll(() => time.inputValue()).toBe('23:00')

    // With the input cleared the buttons fall back to the noon default
    // instead of producing "NaN:00", and the schedule becomes valid again.
    await setScheduleTime(pinnedPage, '')
    await expect.poll(() => isScheduleTimeInvalid(pinnedPage)).toBe(true)
    await plus.click()
    await expect.poll(() => time.inputValue()).toBe('13:00')
    await expect.poll(() => isScheduleTimeInvalid(pinnedPage)).toBe(false)
    await expect.poll(() => dialogSubmit(pinnedPage).isDisabled()).toBe(false)
  })

  test('submitting in "save" mode publishes without going live', async () => {
    await openPublishDialog(defaultPage)

    // Unpublished page → `save` is the default mode.
    expect(await isModeChecked(publishMode(defaultPage, 'save'))).toBe(true)

    // The revision log message must reach the adapter call too. The dialog's
    // only textarea is the revision message field.
    const message = 'Tweaked the hero copy'
    await dialog(defaultPage, 'publish')
      .locator('[data-test="textarea"]')
      .fill(message)
    const published = nextMutation(defaultPage, 'pbPublish')
    await dialogSubmit(defaultPage).click()

    // Saving calls `publish` but must not flip the page live.
    const variables = await published
    expect(variables.publishIfUnpublished).toBe(false)
    expect(variables.revisionLogMessage).toBe(message)

    // Drupal stored the changes, and the page is still unpublished.
    await reopenAfterPublish(defaultPage, DRAFT_PATH)
    expect(
      await withApp(defaultPage, (app) => app.state.entity.value.status),
    ).toBe(false)
  })

  test('submitting in "publish" mode publishes immediately', async () => {
    await openPublishDialog(defaultPage)

    await publishMode(defaultPage, 'immediate').click()
    await expect
      .poll(() => isModeChecked(publishMode(defaultPage, 'immediate')))
      .toBe(true)
    const published = nextMutation(defaultPage, 'pbPublish')
    await dialogSubmit(defaultPage).click()

    expect((await published).publishIfUnpublished).toBe(true)

    // Drupal published the page.
    await reopenAfterPublish(defaultPage, DRAFT_PATH)
    expect(
      await withApp(defaultPage, (app) => app.state.entity.value.status),
    ).toBe(true)
  })

  test('warns when blocks are scheduled to be published', async () => {
    // Two blocks scheduled for the same future date (relative to NOW). The
    // scheduling itself is the pending mutation that enables the Publish button.
    const a = await addBlock(pinnedPage, { fieldName: 'field_paragraphs' })
    const b = await addBlock(pinnedPage, { fieldName: 'field_paragraphs' })
    await scheduleBlocksPublish(
      pinnedPage,
      [a!, b!],
      new Date(Date.UTC(YEAR, 5, 20, 9)).toISOString(),
    )

    await openAppMenu(pinnedPage)
    await appMenuButton(pinnedPage, 'publish').click()
    await dialog(pinnedPage, 'publish').waitFor({ state: 'visible' })

    const notice = pinnedPage.locator(
      '[data-test="publish-scheduled-blocks-notice"]',
    )

    // The page is unpublished, so the default mode is "save" — the notice only
    // matters once something actually goes live, so it stays hidden.
    expect(await isModeChecked(publishMode(pinnedPage, 'save'))).toBe(true)
    expect(await notice.count()).toBe(0)

    // Switching to "publish immediately" surfaces the notice. Both blocks share
    // one publish date, so they group into a single message.
    await publishMode(pinnedPage, 'immediate').click()
    await notice.waitFor({ state: 'visible' })
    const messages = notice.locator('[data-test="publish-scheduled-block"]')
    expect(await messages.count()).toBe(1)

    // The message names the scheduled date (locale-independent: the year).
    const text = (await messages.first().textContent()) ?? ''
    expect(text).toContain(String(YEAR))
  })

  test('submitting in "schedule" mode schedules for the chosen date', async () => {
    await openPublishDialog(pinnedPage)

    await publishMode(pinnedPage, 'scheduled').click()
    await scheduleDate(pinnedPage).waitFor({ state: 'visible' })

    const message = 'Publish the autumn campaign'
    await dialog(pinnedPage, 'publish')
      .locator('[data-test="textarea"]')
      .fill(message)

    // Default schedule is tomorrow at noon; submit it as-is.
    const scheduledMutation = nextMutation(pinnedPage, 'pbSchedule')
    await dialogSubmit(pinnedPage).click()

    // Scheduling calls `scheduleEditState` (not `publish`) with that instant —
    // tomorrow noon local under UTC — and the revision log message.
    const tomorrowNoon = new Date(Date.UTC(YEAR, 5, 16, 12)).toISOString()
    const variables = await scheduledMutation
    expect(variables.date).toBe(tomorrowNoon)
    expect(variables.revisionLogMessage).toBe(message)

    // The editor reflects the schedule: the toolbar shows the scheduled-date
    // button for that instant. (Currently rendered by the `entity-title`
    // feature; asserted here as part of the publish flow's outcome.) The
    // attribute carries it in Drupal's format.
    const scheduled = pinnedPage.locator('[data-test="toolbar-scheduled-date"]')
    const scheduledDate = async () =>
      new Date(
        (await scheduled.getAttribute('data-test-scheduled-date'))!,
      ).toISOString()
    await scheduled.waitFor({ state: 'visible' })
    expect(await scheduledDate()).toBe(tomorrowNoon)

    // Drupal stored it.
    await pinnedPage.reload()
    await waitForEditorReady(pinnedPage)
    await scheduled.waitFor({ state: 'visible' })
    expect(await scheduledDate()).toBe(tomorrowNoon)
  })
})
