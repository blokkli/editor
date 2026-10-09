import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { setFixedTime } from '../../../e2e/support/session'
import {
  addBlock,
  selectBlock,
  isBlockMuted,
} from '../../../e2e/support/blocks'
import { itemAction } from '../../../e2e/support/itemActions'
import {
  dialog,
  dialogSubmit,
  dismissMessages,
} from '../../../e2e/support/overlays'
import { emitEvent } from '../../../e2e/support/events'
import {
  scheduleDate,
  pickScheduleDay,
  setScheduleTime,
} from '../../../e2e/support/schedule'
import { nextMutation } from '../../support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

/**
 * The block-scheduler feature: a block-actions item action (id `block-scheduler`)
 * that opens a dialog with a publish and an unpublish section. Each section is
 * available only for paragraph types that support it (`hasPublishOn` /
 * `hasUnpublishOn`, the scheduler's settings of the type): `text` → both,
 * `title` → neither. Setting a future `publishOn` makes Drupal report the
 * paragraph as unpublished, which `DraggableList` reflects as
 * `data-bk-is-muted="true"`.
 *
 * The scheduler reads the wall clock (default schedule is tomorrow at noon), so
 * the date-asserting tests pin both the clock and the timezone the same way the
 * publish dialog tests do: the fixed instant below maps to local 15 June, 10:00,
 * under `UTC`, making "tomorrow noon" 16 June, 12:00. A year from now: Drupal
 * only accepts schedules after its own time.
 */
const YEAR = new Date().getUTCFullYear() + 1
const NOW = new Date(Date.UTC(YEAR, 5, 15, 10)).toISOString()

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
 * Page lifecycle: one editor page on the page "Blocks" (`UTC` timezone, the
 * clock pinned to {@link NOW}) is shared by every test. Each test adds its own
 * paragraph, so they just accumulate harmlessly between tests. `afterEach`
 * closes any open dialog and dismisses the success toast each submit emits
 * (toasts otherwise stick around for ~6s and intercept clicks on the next
 * block-actions toolbar).
 */
describe('The block scheduler', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  /** Add a `bundle` paragraph on the shared page and return its uuid. */
  async function addOne(bundle: string): Promise<string> {
    const uuid = await addBlock(page, { bundle, fieldName: 'field_paragraphs' })
    expect(uuid).toBeTruthy()
    return uuid!
  }

  /** Select the block and open its scheduler dialog. */
  async function openScheduler(uuid: string): Promise<void> {
    await selectBlock(page, uuid)
    await scheduleAction(page).click()
    await dialog(page, 'block-scheduler').waitFor({ state: 'visible' })
  }

  /** Submits the dialog and returns the items Drupal received. */
  async function submit() {
    const scheduled = nextMutation(page, 'pbSetParagraphSchedule')
    await dialogSubmit(page).click()
    return (await scheduled).items
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
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
  })

  test('cannot be opened for a "title" paragraph (neither publish nor unpublish)', async () => {
    const uuid = await addOne('title')
    await selectBlock(page, uuid)
    await scheduleAction(page).waitFor({ state: 'visible' })
    expect(await scheduleAction(page).isDisabled()).toBe(true)
  })

  test('offers both sections for a "text" paragraph', async () => {
    const uuid = await addOne('text')
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
    const uuid = await addOne('text')

    // Nothing scheduled yet: not muted, no indicator on the action.
    expect(await isBlockMuted(page, uuid)).toBe(false)
    expect(await indicator(page).count()).toBe(0)

    await openScheduler(uuid)
    await enableSection(page, 'publish')

    // Pick an explicit future date + time in the publish section's date widget.
    const publish = schedulerSection(page, 'publish')
    await scheduleDate(page, publish).waitFor({ state: 'visible' })
    await pickScheduleDay(page, `${YEAR}-06-20`, publish)
    await setScheduleTime(page, '09:00', publish)

    // Drupal receives the publish schedule for that paragraph.
    const items = await submit()
    expect(items.find((i) => i?.type === 'publish')).toEqual({
      uuid,
      type: 'publish',
      date: `${YEAR}-06-20T09:00:00.000Z`,
    })

    // The editor reflects the future publish date: the block is muted and the
    // action shows its "has dates" indicator (the block is still selected).
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(true)
    await indicator(page).waitFor({ state: 'visible' })
  })

  test('scheduling only an unpublish date does not mute the block', async () => {
    const uuid = await addOne('text')

    await openScheduler(uuid)
    await enableSection(page, 'unpublish')
    // Submit the default (tomorrow at noon) — no datepicker interaction.
    const items = await submit()
    expect(items.find((i) => i?.type === 'unpublish')).toEqual({
      uuid,
      type: 'unpublish',
      date: `${YEAR}-06-16T12:00:00.000Z`,
    })

    // Unpublish-on alone leaves the block published (and visible) for now: the
    // indicator shows it has a schedule, but it is not muted.
    await indicator(page).waitFor({ state: 'visible' })
    expect(await isBlockMuted(page, uuid)).toBe(false)
  })

  test('clearing the publish date un-mutes the block again', async () => {
    const uuid = await addOne('text')

    // First schedule a publish date so the block is muted.
    await openScheduler(uuid)
    await enableSection(page, 'publish')
    await scheduleDate(page, schedulerSection(page, 'publish')).waitFor({
      state: 'visible',
    })
    await submit()
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(true)

    // Reopen and turn the publish toggle back off — disabling clears the date.
    await openScheduler(uuid)
    await enableSection(page, 'publish')
    const items = await submit()
    const publish = items.find((i) => i?.type === 'publish')
    expect(publish).toMatchObject({ uuid, type: 'publish' })
    expect(publish?.date ?? null).toBeNull()

    // The block is no longer muted and the indicator is gone.
    await expect.poll(() => isBlockMuted(page, uuid)).toBe(false)
    await indicator(page).waitFor({ state: 'detached' })
  })
})
