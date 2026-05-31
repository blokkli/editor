import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import {
  appMenu,
  appMenuButton,
  closeAppMenu,
  openAppMenu,
} from './../../support/menu'
import { dialog, dialogSubmit, dismissMessages } from './../../support/overlays'
import { addBlock } from './../../support/blocks'
import { clearAdapterCalls, waitForAdapterCall } from './../../support/recorder'
import { setupEditorE2E } from './../../support/setup'
import { openEditor, withApp, setFixedTime } from './../../support/session'
import { emitEvent } from './../../support/events'
import {
  scheduleDate,
  scheduleTime,
  scheduleError,
  pickScheduleDay,
  setScheduleTime,
} from './../../support/schedule'

/**
 * The publish dialog (the playground adapter implements `getPublishOptions`, so
 * the menu's Publish button opens the dialog rather than publishing directly).
 * Covers reaching the dialog, switching between its three modes, and the
 * scheduler's future-date validation.
 *
 * Selectors are `data-test` only (the DOM contract). The scheduler reads the
 * wall clock, so the relevant tests pin both the clock and the timezone: the
 * fixed instant below maps to local **2026-06-15 10:00** under `UTC`.
 */
const NOW = '2026-06-15T10:00:00.000Z'
const TODAY = '2026-06-15'

function publishMode(page: Page, mode: 'save' | 'immediate' | 'scheduled') {
  return page.locator(`[data-test="publish-mode-${mode}"]`)
}

/** Schedule `uuids` to be published on `date` (a real adapter mutation). */
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
 * Page lifecycle: two pages opened in parallel.
 *
 * `defaultPage` (no clock pinning) handles tests 1, 2, 4 & 5 — the
 * happy-path "opens", "mode toggle" tests plus the two `publish` submits
 * (save + immediate).
 *
 * `pinnedPage` is opened with timezone `UTC` and the clock pinned to `NOW`
 * once in `beforeAll`. It serves the three scheduler tests — 3, 7 & 6 —
 * but in THAT order. Test 6 submits `scheduleEditState` which sets the
 * entity's `publishOn`, and the publish dialog defaults to `scheduled` mode
 * whenever `publishOn` is set; running test 6 last avoids polluting tests
 * 3 and 7 which both assert `save` is the initial mode.
 *
 * `afterEach` closes any open dialog/menu, dismisses success messages, and
 * clears the adapter recorder — so each test's `waitForAdapterCall` only
 * sees its own submit.
 */
describe('The publish dialog', async () => {
  await setupEditorE2E()

  let defaultPage: Page
  let pinnedPage: Page

  /**
   * Open the publish dialog on an already-open editor `page`. Adds a block
   * to give the editor a pending mutation (Publish is disabled without one),
   * then opens the app menu and clicks the Publish button.
   */
  async function openPublishDialog(page: Page): Promise<void> {
    await addBlock(page)
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
  }

  beforeAll(async () => {
    ;[defaultPage, pinnedPage] = await Promise.all([
      openEditor('/page/1?blokkliEditing=1&testing=true'),
      openEditor('/page/1?blokkliEditing=1&testing=true', {
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
    await clearAdapterCalls(page)
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
    await dialogSubmit(defaultPage).click()

    // Saving calls `publish` but must not flip the page live.
    const args = await waitForAdapterCall<{
      publishIfUnpublished?: boolean
      revisionLogMessage?: string
    }>(defaultPage, 'publish')
    expect(args.publishIfUnpublished).toBe(false)
    expect(args.revisionLogMessage).toBe(message)
  })

  test('submitting in "publish" mode publishes immediately', async () => {
    await openPublishDialog(defaultPage)

    await publishMode(defaultPage, 'immediate').click()
    await expect
      .poll(() => isModeChecked(publishMode(defaultPage, 'immediate')))
      .toBe(true)
    await dialogSubmit(defaultPage).click()

    const args = await waitForAdapterCall<{ publishIfUnpublished?: boolean }>(
      defaultPage,
      'publish',
    )
    expect(args.publishIfUnpublished).toBe(true)
  })

  test('warns when blocks are scheduled to be published', async () => {
    // Two blocks scheduled for the same future date (relative to NOW). The
    // scheduling itself is the pending mutation that enables the Publish button.
    const a = await addBlock(pinnedPage)
    const b = await addBlock(pinnedPage)
    await scheduleBlocksPublish(
      pinnedPage,
      [a!, b!],
      '2026-06-20T09:00:00.000Z',
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
    expect(text).toContain('2026')
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
    await dialogSubmit(pinnedPage).click()

    // Scheduling calls `scheduleEditState` (not `publish`) with that instant —
    // tomorrow noon local under UTC — and the revision log message.
    const args = await waitForAdapterCall<{
      date: string
      revisionLogMessage?: string
    }>(pinnedPage, 'scheduleEditState')
    expect(args.date).toBe('2026-06-16T12:00:00.000Z')
    expect(args.revisionLogMessage).toBe(message)

    // The editor reflects the schedule: the toolbar shows the scheduled-date
    // button for that instant. (Currently rendered by the `entity-title`
    // feature; asserted here as part of the publish flow's outcome.)
    const scheduled = pinnedPage.locator('[data-test="toolbar-scheduled-date"]')
    await scheduled.waitFor({ state: 'visible' })
    expect(await scheduled.getAttribute('data-test-scheduled-date')).toBe(
      '2026-06-16T12:00:00.000Z',
    )
  })
})
