import { describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock } from './../../support/blocks'
import { formOverlay, dialog } from './../../support/overlays'
import { toolbarButton } from './../../support/toolbar'

/**
 * The entity-title feature (`features/entity-title/index.vue`) renders the
 * toolbar's page identity: the title/status button (opens the entity edit form),
 * a status indicator, and — when a publish is scheduled — a date badge (opens the
 * publish dialog). It also registers an `edit entity` command.
 *
 * Selectors are `data-test` only. The status indicator's three states come from
 * the entity's published flag and the pending-mutation count: unpublished →
 * `error`; published, no changes → `success`; published with pending changes →
 * `warning`. The mock entity is unpublished by default, so the published states
 * are reached by seeding `blokkli:test:entityStatus` (read in the mock's
 * `mapState`, gated by `testing=true`). The status is surfaced on the button as
 * `data-test-entity-status`, so we assert the raw state, not translated copy.
 *
 * The scheduled-date badge reads `state.publishOptions.publishOn`, which the mock
 * derives from the `blokkli_schedule_<type>_<uuid>` localStorage key
 * (`content`/`1` for `/page/1`). Seeding it before navigation makes the badge
 * appear on load. Its visible text is locale-formatted, so we assert the raw ISO
 * carried in `data-test-scheduled-date`.
 */

const COMMAND_ID = 'feature:entity-title:edit-entity'
const SCHEDULED_AT = '2026-08-20T09:00:00.000Z'

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

describe('The entity-title feature', async () => {
  await setupEditorE2E()

  test('an unpublished page shows the error status and no scheduled badge', async () => {
    const page = await openEditor()

    // The mock entity is unpublished by default → the status indicator is in its
    // `error` state, and with nothing scheduled the date badge is absent.
    await expect.poll(() => entityStatus(page)).toBe('error')
    expect(await scheduledBadge(page).count()).toBe(0)

    await page.close()
  })

  test('a published page with no pending changes shows the success status', async () => {
    const page = await openEditor(undefined, {
      localStorage: { 'blokkli:test:entityStatus': 'true' },
    })

    await expect.poll(() => entityStatus(page)).toBe('success')

    await page.close()
  })

  test('a published page with pending changes shows the warning status', async () => {
    const page = await openEditor(undefined, {
      localStorage: { 'blokkli:test:entityStatus': 'true' },
    })
    await expect.poll(() => entityStatus(page)).toBe('success')

    // A pending mutation on a published page flips success → warning.
    await addBlock(page)
    await expect.poll(() => entityStatus(page)).toBe('warning')

    await page.close()
  })

  test('pending changes do not upgrade the status of an unpublished page', async () => {
    const page = await openEditor()
    await expect.poll(() => entityStatus(page)).toBe('error')

    // The `warning` state is gated on the page being published — a pending
    // mutation alone must NOT promote an unpublished page out of `error`.
    await addBlock(page)
    await expect
      .poll(() => withApp(page, (app) => app.state.mutations.value.length))
      .toBeGreaterThan(0)
    expect(await entityStatus(page)).toBe('error')

    await page.close()
  })

  test('clicking the title opens the entity edit form', async () => {
    const page = await openEditor()

    await entityTitle(page).click()
    // Entity edit reuses the `edit-form` overlay id.
    await formOverlay(page, 'edit-form').waitFor({ state: 'visible' })
    expect(await formOverlay(page, 'edit-form').count()).toBe(1)

    await page.close()
  })

  test('the registered edit-entity command opens the entity edit form', async () => {
    const page = await openEditor()

    // The feature registers its command unconditionally.
    const commandIds = await withApp(page, (app) =>
      app.commands.getCommands().map((c) => c.id),
    )
    expect(commandIds).toContain(COMMAND_ID)

    // Run it through the palette (same `onEditEntity` target as the button).
    await toolbarButton(page, 'command_palette').click()
    const command = page.locator(`[data-test-command-id="${COMMAND_ID}"]`)
    await command.waitFor({ state: 'visible' })
    await command.click()

    await formOverlay(page, 'edit-form').waitFor({ state: 'visible' })
    expect(await formOverlay(page, 'edit-form').count()).toBe(1)

    await page.close()
  })

  test('a scheduled publish shows the badge with the raw ISO and opens the publish dialog', async () => {
    const page = await openEditor(undefined, {
      localStorage: {
        blokkli_schedule_content_1: JSON.stringify({
          date: SCHEDULED_AT,
          revisionLogMessage: null,
        }),
      },
    })

    const badge = scheduledBadge(page)
    await badge.waitFor({ state: 'visible' })
    // The visible text is locale-formatted; the attribute carries the raw instant.
    expect(await badge.getAttribute('data-test-scheduled-date')).toBe(
      SCHEDULED_AT,
    )

    // Clicking the badge opens the publish dialog (a different handler than the
    // title button's edit flow).
    await badge.click()
    await dialog(page, 'publish').waitFor({ state: 'visible' })
    expect(await dialog(page, 'publish').count()).toBe(1)

    await page.close()
  })
})
