import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, setFixedTime } from '../../support/session'
import { setupEditorE2E } from '../../support/setup'
import { addBlock, selectBlock, isBlockMuted } from '../../support/blocks'
import { itemAction } from '../../support/itemActions'
import { dialog, dialogSubmit, dismissMessages } from '../../support/overlays'
import { emitEvent } from '../../support/events'
import {
  clearAdapterCalls,
  recordedAdapterCalls,
  waitForAdapterCall,
} from '../../support/recorder'
import {
  scheduleDate,
  pickScheduleDay,
  setScheduleTime,
} from '../../support/schedule'

/**
 * The block-scheduler feature: a block-actions item action (id `block-scheduler`)
 * that opens a dialog with a publish and an unpublish section. Each section is
 * available only for bundles that support it (`hasPublishOn` / `hasUnpublishOn`):
 * `card` → both, `title` → unpublish only, `button` → neither
 * (`playground/app/mock/allTypes.ts`). Setting a future `publishOn` makes the
 * mock report the block as unpublished, which `DraggableList` reflects as
 * `data-bk-is-muted="true"`.
 *
 * The scheduler reads the wall clock (default schedule is tomorrow at noon), so
 * the date-asserting tests pin both the clock and the timezone the same way the
 * publish dialog tests do: the fixed instant below maps to local
 * **2026-06-15 10:00** under `UTC`, making "tomorrow noon"
 * `2026-06-16T12:00:00.000Z`.
 */
const NOW = '2026-06-15T10:00:00.000Z'

type RecordedSchedule = {
  blocks: Array<{ uuid: string; type: 'publish' | 'unpublish'; date?: string }>
}

const scheduleAction = (page: Page): Locator =>
  itemAction(page, 'block-scheduler')

const indicator = (page: Page): Locator =>
  page.locator('[data-test="block-scheduler-indicator"]')

const schedulerSection = (page: Page, type: 'publish' | 'unpublish'): Locator =>
  page.locator(`[data-test="scheduler-${type}"]`)

/** Toggle a section's "Enable schedule" switch (the dialog `FormToggle`). */
const enableSection = (
  page: Page,
  type: 'publish' | 'unpublish',
): Promise<void> =>
  page.locator(`[data-test="scheduler-${type}-toggle"]`).click()

/**
 * Page lifecycle: one editor page (with `?testing=true` for the adapter
 * recorder, `UTC` timezone, and the clock pinned to {@link NOW}) is shared by
 * every test. Each test adds its own block (the bundles differ, so blocks
 * just accumulate harmlessly between tests). `afterEach` closes any open
 * dialog, dismisses the success toast each submit emits (toasts otherwise
 * stick around for ~6s and intercept clicks on the next block-actions
 * toolbar), and clears the adapter recorder so `waitForAdapterCall` doesn't
 * pick up a stale call.
 */
describe('The block scheduler', async () => {
  await setupEditorE2E()

  let page: Page

  /** Add a `bundle` block on the shared page and return its uuid. */
  async function addOne(bundle: string): Promise<string> {
    const uuid = await addBlock(page, { bundle })
    expect(uuid).toBeTruthy()
    return uuid!
  }

  /** Select the block and open its scheduler dialog. */
  async function openScheduler(uuid: string): Promise<void> {
    await selectBlock(page, uuid)
    await scheduleAction(page).click()
    await dialog(page, 'block-scheduler').waitFor({ state: 'visible' })
  }

  beforeAll(async () => {
    page = await openEditor('/page/1?blokkliEditing=1&testing=true', {
      timezoneId: 'UTC',
    })
    // Pin the clock once for all tests. None of these tests drives the canvas
    // drag, so the frozen-`Date.now()` drag-stall trap doesn't apply.
    await setFixedTime(page, NOW)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    // Close the scheduler dialog when open — its `<Dialog>` listens for
    // `overlay:close` on the eventbus and emits `cancel`.
    if (await dialog(page, 'block-scheduler').isVisible()) {
      await emitEvent(page, 'overlay:close')
      await dialog(page, 'block-scheduler').waitFor({ state: 'hidden' })
    }

    // Dismiss the success toast each submit emits — toasts otherwise hang
    // around for ~6s and overlay the bottom of the canvas, intercepting
    // clicks on the next test's block-actions toolbar.
    await dismissMessages(page)

    // Clear the adapter recorder so the next test starts with empty records.
    // (`waitForAdapterCall` returns the latest matching call, so a stale
    // record from a previous test would resolve a subsequent wait too early.)
    await clearAdapterCalls(page)
  })

  test('cannot be opened for a "button" block (neither publish nor unpublish)', async () => {
    const uuid = await addOne('button')
    await selectBlock(page, uuid)
    await scheduleAction(page).waitFor({ state: 'visible' })
    expect(await scheduleAction(page).isDisabled()).toBe(true)
  })

  test('offers only the unpublish section for a "title" block', async () => {
    const uuid = await addOne('title')
    await openScheduler(uuid)

    // Publish is unavailable (toggle disabled), unpublish is available.
    expect(
      await schedulerSection(page, 'publish').getAttribute(
        'data-test-disabled',
      ),
    ).toBe('true')
    expect(
      await page
        .locator(
          '[data-test="scheduler-publish-toggle"] input[type="checkbox"]',
        )
        .isDisabled(),
    ).toBe(true)
    expect(
      await schedulerSection(page, 'unpublish').getAttribute(
        'data-test-disabled',
      ),
    ).toBe('false')
  })

  test('offers both sections for a "card" block', async () => {
    const uuid = await addOne('card')
    await openScheduler(uuid)

    expect(
      await schedulerSection(page, 'publish').getAttribute(
        'data-test-disabled',
      ),
    ).toBe('false')
    expect(
      await schedulerSection(page, 'unpublish').getAttribute(
        'data-test-disabled',
      ),
    ).toBe('false')
  })

  test('scheduling a publish date persists it and mutes the block', async () => {
    const uuid = await addOne('card')

    // Nothing scheduled yet: not muted, no indicator on the action.
    expect(await isBlockMuted(page, uuid)).toBe(false)
    expect(await indicator(page).count()).toBe(0)

    await openScheduler(uuid)
    await enableSection(page, 'publish')

    // Pick an explicit future date + time in the publish section's date widget.
    const publish = schedulerSection(page, 'publish')
    await scheduleDate(page, publish).waitFor({ state: 'visible' })
    await pickScheduleDay(page, '2026-06-20', publish)
    await setScheduleTime(page, '09:00', publish)

    await dialogSubmit(page).click()

    // The adapter receives the publish schedule for that block.
    const args = await waitForAdapterCall<RecordedSchedule>(
      page,
      'setBlockScheduleDate',
    )
    expect(args.blocks.find((b) => b.type === 'publish')).toEqual({
      uuid,
      type: 'publish',
      date: '2026-06-20T09:00:00.000Z',
    })

    // The editor reflects the future publish date: the block is muted and the
    // action shows its "has dates" indicator (the block is still selected).
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(true)
    await indicator(page).waitFor({ state: 'visible' })
  })

  test('scheduling only an unpublish date does not mute the block', async () => {
    const uuid = await addOne('card')

    await openScheduler(uuid)
    await enableSection(page, 'unpublish')
    // Submit the default (tomorrow at noon) — no datepicker interaction.
    await dialogSubmit(page).click()

    const args = await waitForAdapterCall<RecordedSchedule>(
      page,
      'setBlockScheduleDate',
    )
    expect(args.blocks.find((b) => b.type === 'unpublish')).toEqual({
      uuid,
      type: 'unpublish',
      date: '2026-06-16T12:00:00.000Z',
    })

    // Unpublish-on alone leaves the block published (and visible) for now: the
    // indicator shows it has a schedule, but it is not muted.
    await indicator(page).waitFor({ state: 'visible' })
    expect(await isBlockMuted(page, uuid)).toBe(false)
  })

  test('clearing the publish date un-mutes the block again', async () => {
    const uuid = await addOne('card')

    // First schedule a publish date so the block is muted.
    await openScheduler(uuid)
    await enableSection(page, 'publish')
    await scheduleDate(page, schedulerSection(page, 'publish')).waitFor({
      state: 'visible',
    })
    await dialogSubmit(page).click()
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(true)

    // Reopen and turn the publish toggle back off — disabling clears the date.
    await openScheduler(uuid)
    await enableSection(page, 'publish')
    await dialogSubmit(page).click()

    // A second schedule call lands; its publish entry clears the date (the
    // `undefined` date is dropped from the recorded JSON). The recorder was
    // cleared in `afterEach` from the previous test, so both calls are this
    // test's.
    await expect
      .poll(
        async () =>
          (await recordedAdapterCalls(page)).filter(
            (c) => c.method === 'setBlockScheduleDate',
          ).length,
      )
      .toBe(2)
    const calls = await recordedAdapterCalls<RecordedSchedule>(page)
    const last = calls
      .filter((c) => c.method === 'setBlockScheduleDate')
      .at(-1)!
    expect(last.args.blocks.find((b) => b.type === 'publish')).toEqual({
      uuid,
      type: 'publish',
    })

    // The block is no longer muted and the indicator is gone.
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(false)
    await indicator(page).waitFor({ state: 'detached' })
  })
})
