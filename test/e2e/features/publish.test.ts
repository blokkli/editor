import { describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp, setFixedTime } from './../support/session'
import { openAppMenu, appMenuButton } from './../support/menu'
import { dialog, dialogSubmit } from './../support/overlays'
import { addBlock } from './../support/blocks'
import { waitForAdapterCall } from './../support/recorder'
import { setupEditorE2E } from './../support/setup'
import {
  scheduleDate,
  scheduleTime,
  scheduleError,
  pickScheduleDay,
  setScheduleTime,
} from './../support/schedule'

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

describe('The publish dialog', async () => {
  await setupEditorE2E()

  /**
   * Open the editor, make a change (the Publish button is disabled without
   * pending mutations), and open the publish dialog from the app menu. Returns
   * the page once the dialog is visible.
   */
  async function openPublishDialog(
    opts: { now?: string; timezoneId?: string } = {},
  ): Promise<Page> {
    // `testing=true` makes the mock adapter record mutation args (see
    // `waitForAdapterCall`); the clock is pinned later, after the mutation.
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true', {
      timezoneId: opts.timezoneId,
    })

    // The Publish button is disabled without pending mutations — add a block to
    // create one (a plain adapter mutation, no drag/editable to clean up).
    await addBlock(page)
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)

    // Pin the clock now, before the dialog reads it (and after any mutation so a
    // frozen Date.now() can't interfere).
    if (opts.now !== undefined) {
      await setFixedTime(page, opts.now)
    }

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })

    return page
  }

  test('opens from the app menu', async () => {
    const page = await openPublishDialog()
    expect(await dialog(page, 'publish').count()).toBe(1)
    await page.close()
  })

  test('switching mode toggles the schedule UI', async () => {
    const page = await openPublishDialog()
    const scheduleUi = scheduleDate(page)

    // The page is unpublished, so `save` is the initial mode and there's no
    // schedule UI.
    expect(await isModeChecked(publishMode(page, 'save'))).toBe(true)
    expect(await scheduleUi.isHidden()).toBe(true)

    // Scheduling reveals the date picker + time selector.
    await publishMode(page, 'scheduled').click()
    await expect
      .poll(() => isModeChecked(publishMode(page, 'scheduled')))
      .toBe(true)
    await scheduleUi.waitFor({ state: 'visible' })
    await scheduleTime(page).waitFor({ state: 'visible' })

    // Publishing immediately hides it again.
    await publishMode(page, 'immediate').click()
    await expect
      .poll(() => isModeChecked(publishMode(page, 'immediate')))
      .toBe(true)
    await scheduleUi.waitFor({ state: 'hidden' })

    await page.close()
  })

  test('rejects a schedule in the past and accepts one in the future', async () => {
    const page = await openPublishDialog({ now: NOW, timezoneId: 'UTC' })

    await publishMode(page, 'scheduled').click()
    await scheduleDate(page).waitFor({ state: 'visible' })

    const error = scheduleError(page)

    // Default schedule is tomorrow at noon — valid, so no error and submit is
    // enabled.
    await error.waitFor({ state: 'hidden' })
    await expect.poll(() => dialogSubmit(page).isDisabled()).toBe(false)

    // Move it to today (10:00 now) at 08:00 — in the past, so it fails the
    // "must be in the future" rule: error shows, submit is blocked.
    await pickScheduleDay(page, TODAY)
    await setScheduleTime(page, '08:00')
    await error.waitFor({ state: 'visible' })
    await expect.poll(() => dialogSubmit(page).isDisabled()).toBe(true)

    // Bump it to 11:00, comfortably in the future — the error clears and submit
    // is enabled again.
    await setScheduleTime(page, '11:00')
    await error.waitFor({ state: 'hidden' })
    await expect.poll(() => dialogSubmit(page).isDisabled()).toBe(false)

    await page.close()
  })

  test('submitting in "save" mode publishes without going live', async () => {
    const page = await openPublishDialog()

    // Unpublished page → `save` is the default mode.
    expect(await isModeChecked(publishMode(page, 'save'))).toBe(true)

    // The revision log message must reach the adapter call too. The dialog's
    // only textarea is the revision message field.
    const message = 'Tweaked the hero copy'
    await dialog(page, 'publish')
      .locator('[data-test="textarea"]')
      .fill(message)
    await dialogSubmit(page).click()

    // Saving calls `publish` but must not flip the page live.
    const args = await waitForAdapterCall<{
      publishIfUnpublished?: boolean
      revisionLogMessage?: string
    }>(page, 'publish')
    expect(args.publishIfUnpublished).toBe(false)
    expect(args.revisionLogMessage).toBe(message)

    await page.close()
  })

  test('submitting in "publish" mode publishes immediately', async () => {
    const page = await openPublishDialog()

    await publishMode(page, 'immediate').click()
    await expect
      .poll(() => isModeChecked(publishMode(page, 'immediate')))
      .toBe(true)
    await dialogSubmit(page).click()

    const args = await waitForAdapterCall<{ publishIfUnpublished?: boolean }>(
      page,
      'publish',
    )
    expect(args.publishIfUnpublished).toBe(true)

    await page.close()
  })

  test('submitting in "schedule" mode schedules for the chosen date', async () => {
    const page = await openPublishDialog({ now: NOW, timezoneId: 'UTC' })

    await publishMode(page, 'scheduled').click()
    await scheduleDate(page).waitFor({ state: 'visible' })

    const message = 'Publish the autumn campaign'
    await dialog(page, 'publish')
      .locator('[data-test="textarea"]')
      .fill(message)

    // Default schedule is tomorrow at noon; submit it as-is.
    await dialogSubmit(page).click()

    // Scheduling calls `scheduleEditState` (not `publish`) with that instant —
    // tomorrow noon local under UTC — and the revision log message.
    const args = await waitForAdapterCall<{
      date: string
      revisionLogMessage?: string
    }>(page, 'scheduleEditState')
    expect(args.date).toBe('2026-06-16T12:00:00.000Z')
    expect(args.revisionLogMessage).toBe(message)

    // The editor reflects the schedule: the toolbar shows the scheduled-date
    // button for that instant. (Currently rendered by the `entity-title`
    // feature; asserted here as part of the publish flow's outcome.)
    const scheduled = page.locator('[data-test="toolbar-scheduled-date"]')
    await scheduled.waitFor({ state: 'visible' })
    expect(await scheduled.getAttribute('data-test-scheduled-date')).toBe(
      '2026-06-16T12:00:00.000Z',
    )

    await page.close()
  })

  test('warns when blocks are scheduled to be published', async () => {
    const page = await openEditor('/page/1?blokkliEditing=1&testing=true', {
      timezoneId: 'UTC',
    })

    // Two blocks scheduled for the same future date (relative to NOW). The
    // scheduling itself is the pending mutation that enables the Publish button.
    const a = await addBlock(page)
    const b = await addBlock(page)
    await scheduleBlocksPublish(page, [a!, b!], '2026-06-20T09:00:00.000Z')
    await setFixedTime(page, NOW)

    await openAppMenu(page)
    await appMenuButton(page, 'publish').click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })

    const notice = page.locator('[data-test="publish-scheduled-blocks-notice"]')

    // The page is unpublished, so the default mode is "save" — the notice only
    // matters once something actually goes live, so it stays hidden.
    expect(await isModeChecked(publishMode(page, 'save'))).toBe(true)
    expect(await notice.count()).toBe(0)

    // Switching to "publish immediately" surfaces the notice. Both blocks share
    // one publish date, so they group into a single message.
    await publishMode(page, 'immediate').click()
    await notice.waitFor({ state: 'visible' })
    const messages = notice.locator('[data-test="publish-scheduled-block"]')
    expect(await messages.count()).toBe(1)

    // The message names the scheduled date (locale-independent: the year).
    const text = (await messages.first().textContent()) ?? ''
    expect(text).toContain('2026')

    await page.close()
  })
})
