import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import {
  waitForEditorReady,
  withApp,
  BLOCKS_EDITOR_PATH,
  editorPath,
  openEditor,
} from '../../support/session'
import { addBlock } from '../../support/blocks'
import { closeFormOverlay, dialog, formOverlay } from '../../support/overlays'
import { toolbarButton } from '../../support/toolbar'
import { emitEvent } from '../../support/events'
import { nextMutation } from '../../support/mutations'
import { isRecentIsoDate } from '../../support/dates'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'

/**
 * The entity-title feature (`features/entity-title/index.vue`) renders the
 * toolbar's page identity: the title/status button (opens the entity edit form),
 * a status indicator, and — when a publish is scheduled — a date badge (opens the
 * publish dialog). It also registers an `edit entity` command.
 *
 * Selectors are `data-test` only. The status indicator's three states come from
 * the entity's published flag and the pending-mutation count: unpublished →
 * `error`; published, no changes → `success`; published with pending changes →
 * `warning`. The page "Draft" (content/nodes/draft.yml) is unpublished, the
 * page "Blocks" published. The status is surfaced on the button as
 * `data-test-entity-status`, so we assert the raw state, not translated copy.
 *
 * The scheduled-date badge reads `state.publishOptions.publishOn`: the spec
 * schedules the publication of the page "Announcement"
 * (content/nodes/announcement.yml) through the adapter, then reloads. Its
 * visible text is locale-formatted, so we assert the instant carried in
 * `data-test-scheduled-date`.
 */

const COMMAND_ID = 'feature:entity-title:edit-entity'

/** A full hour 30 days from now: Drupal only schedules in the future. */
const SCHEDULED_AT = new Date(
  Math.ceil(Date.now() / 3_600_000) * 3_600_000 + 30 * 86_400_000,
).toISOString()

/** The main title/status button. */
function entityTitle(page: Page): Locator {
  return page.locator('[data-test="entity-title"]')
}

/** The scheduled-date badge (only rendered when a publish is scheduled). */
function scheduledBadge(page: Page): Locator {
  return page.locator('[data-test="toolbar-scheduled-date"]')
}

/** The current status-indicator state read off the title button. */
function entityStatus(page: Page): Promise<string | null> {
  return entityTitle(page).getAttribute('data-test-entity-status')
}

/**
 * Page lifecycle: three editor pages opened in parallel:
 * - `defaultPage` (the page "Draft", unpublished) — tests 1, 4, 5, 6
 * - `publishedPage` (the page "Blocks") — tests 2 and 3
 * - `scheduledPage` (the page "Announcement", its publication scheduled in
 *   `beforeAll`) — test 7
 *
 * Per-page test order matters on `publishedPage`: test 2 reads the
 * `success` status before any mutation; test 3 mutates and expects the
 * status to flip to `warning`. After test 3 the pending mutation persists on
 * `publishedPage`, but no subsequent test uses that page.
 *
 * `afterEach` closes the `edit-form` overlay on `defaultPage` (tests 5 & 6
 * leave it open), the `publish` dialog on `scheduledPage` (test 7 leaves it
 * open), and the command palette on `defaultPage` (test 6 opens it).
 */
describe('The entity-title feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let defaultPage: Page
  let publishedPage: Page
  let scheduledPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[defaultPage, publishedPage, scheduledPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en/draft', 'draft')),
      openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH),
      openEditor(
        sandbox,
        'Anna Keller',
        editorPath('/en/announcement', 'announcement'),
      ),
    ])

    // Schedule the publication, then reload: the badge shows what Drupal
    // stored.
    const scheduled = nextMutation(scheduledPage, 'pbSchedule')
    await scheduledPage.evaluate(async (date) => {
      const app = window.__BLOKKLI__!.app!
      await app.state.mutateWithLoadingState(() =>
        app.adapter.scheduleEditState!({
          hostEntityType: app.context.value.entityType,
          hostEntityUuid: app.context.value.entityUuid,
          date,
        }),
      )
    }, SCHEDULED_AT)
    await scheduled
    await scheduledPage.reload()
    await waitForEditorReady(scheduledPage)
  })

  afterAll(async () => {
    await Promise.all([
      defaultPage.close(),
      publishedPage.close(),
      scheduledPage.close(),
    ])
  })

  afterEach(async () => {
    if (await formOverlay(defaultPage, 'edit-form').isVisible()) {
      await closeFormOverlay(defaultPage, 'edit-form')
    }
    if (
      await defaultPage.locator('[data-test="command-palette"]').isVisible()
    ) {
      await defaultPage.keyboard.press('Escape')
      await defaultPage
        .locator('[data-test="command-palette"]')
        .waitFor({ state: 'detached' })
    }
    if (await dialog(scheduledPage, 'publish').isVisible()) {
      await emitEvent(scheduledPage, 'overlay:close')
      await dialog(scheduledPage, 'publish').waitFor({ state: 'hidden' })
    }
  })

  test('an unpublished page shows the error status and no scheduled badge', async () => {
    // The page is unpublished → the status indicator is in its `error` state,
    // and with nothing scheduled the date badge is absent.
    await expect.poll(() => entityStatus(defaultPage)).toBe('error')
    expect(await scheduledBadge(defaultPage).count()).toBe(0)
  })

  test('a published page with no pending changes shows the success status', async () => {
    await expect.poll(() => entityStatus(publishedPage)).toBe('success')
  })

  test('a published page with pending changes shows the warning status', async () => {
    await expect.poll(() => entityStatus(publishedPage)).toBe('success')

    // A pending mutation on a published page flips success → warning.
    await addBlock(publishedPage, { fieldName: 'field_paragraphs' })
    await expect.poll(() => entityStatus(publishedPage)).toBe('warning')

    // The title says when the edit state was last changed: just now.
    const lastChanged = entityTitle(publishedPage).locator(
      '[data-test="relative-time"]',
    )
    await expect
      .poll(async () =>
        (await lastChanged.count()) === 1
          ? isRecentIsoDate(
              await lastChanged.getAttribute('data-test-relative-time-date'),
            )
          : false,
      )
      .toBe(true)
  })

  test('pending changes do not upgrade the status of an unpublished page', async () => {
    await expect.poll(() => entityStatus(defaultPage)).toBe('error')

    // The `warning` state is gated on the page being published — a pending
    // mutation alone must NOT promote an unpublished page out of `error`.
    await addBlock(defaultPage, { fieldName: 'field_paragraphs' })
    await expect
      .poll(() =>
        withApp(defaultPage, (app) => app.state.mutations.value.length),
      )
      .toBeGreaterThan(0)
    expect(await entityStatus(defaultPage)).toBe('error')
  })

  test('clicking the title opens the entity edit form', async () => {
    await entityTitle(defaultPage).click()
    // Entity edit reuses the `edit-form` overlay id.
    await formOverlay(defaultPage, 'edit-form').waitFor({ state: 'visible' })
    expect(await formOverlay(defaultPage, 'edit-form').count()).toBe(1)
  })

  test('the registered edit-entity command opens the entity edit form', async () => {
    // The feature registers its command unconditionally.
    const commandIds = await withApp(defaultPage, (app) =>
      app.commands.getCommands().map((c) => c.id),
    )
    expect(commandIds).toContain(COMMAND_ID)

    // Run it through the palette (same `onEditEntity` target as the button).
    await toolbarButton(defaultPage, 'command_palette').click()
    const command = defaultPage.locator(
      `[data-test-command-id="${COMMAND_ID}"]`,
    )
    await command.waitFor({ state: 'visible' })
    await command.click()

    await formOverlay(defaultPage, 'edit-form').waitFor({ state: 'visible' })
    expect(await formOverlay(defaultPage, 'edit-form').count()).toBe(1)
  })

  test('a scheduled publish shows the badge with the instant and opens the publish dialog', async () => {
    const badge = scheduledBadge(scheduledPage)
    await badge.waitFor({ state: 'visible' })
    // The visible text is locale-formatted; the attribute carries the instant,
    // in Drupal's format.
    const date = await badge.getAttribute('data-test-scheduled-date')
    expect(new Date(date!).toISOString()).toBe(SCHEDULED_AT)

    // Clicking the badge opens the publish dialog (a different handler than the
    // title button's edit flow).
    await badge.click()
    await dialog(scheduledPage, 'publish').waitFor({ state: 'visible' })
    expect(await dialog(scheduledPage, 'publish').count()).toBe(1)
  })
})
