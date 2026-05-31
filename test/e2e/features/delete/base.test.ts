import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  addBlock,
  blockCount,
  blockExists,
  selectBlock,
} from './../../support/blocks'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from './../../support/itemActions'
import { pressShortcut } from './../../support/keyboard'
import { emitEvent } from './../../support/events'

/**
 * The delete feature (`features/delete/index.vue`) renders a `delete` item
 * action (and a `Delete` keyboard shortcut) that removes the selected block(s).
 * Both paths go through the same handler, which is gated by the block bundle's
 * `delete` permission: when denied, the action button is natively `disabled`
 * and the handler early-returns, so neither clicking nor pressing Delete does
 * anything.
 *
 * Permissions come from the adapter's `getAllBundles()` and are read once at
 * editor init, so a test seeds them up front via `openEditor(path, {
 * permissions })` — a generic, reusable override (see
 * `playground/app/mock/permissionOverrides.ts`) that grants/denies block
 * permissions per bundle without hardcoding test cases in the adapter. Here we
 * deny `delete` for `text` (keeping `add`/`edit`, so `addBlock` still works) and
 * leave other bundles untouched.
 *
 * Assertions are locale-independent: block presence via `blockExists`, counts
 * via `blockCount`, and the native `disabled` state via `itemActionDisabled` —
 * never the translated tooltip copy.
 */

/** Override that denies deleting `text` blocks (but still allows add + edit). */
const DENY_TEXT_DELETE = {
  permissions: { blockPermissions: { text: ['add', 'edit'] } },
}

/**
 * Page lifecycle: two editor pages are opened in parallel in `beforeAll` —
 * one with default permissions (`defaultPage`, used by tests 1 & 2) and one
 * with the `DENY_TEXT_DELETE` override applied at init (`denyPage`, used by
 * tests 3, 4, & 5). Permissions are seeded via `localStorage` *before*
 * navigation and read once at editor init, so they can't be toggled
 * post-hoc without a reload — sharing a page per permission set is the
 * cheapest option. Each test still picks a fresh uuid via `addBlock`, so the
 * accumulating blocks between tests are irrelevant. `afterEach` deselects on
 * both pages.
 */
describe('The delete feature', async () => {
  await setupEditorE2E()

  let defaultPage: Page
  let denyPage: Page

  beforeAll(async () => {
    ;[defaultPage, denyPage] = await Promise.all([
      openEditor(),
      openEditor(EDITOR_PATH, DENY_TEXT_DELETE),
    ])
  })

  afterAll(async () => {
    await Promise.all([defaultPage.close(), denyPage.close()])
  })

  afterEach(async () => {
    await Promise.all([
      emitEvent(defaultPage, 'select:unselect'),
      emitEvent(denyPage, 'select:unselect'),
    ])
  })

  test('clicking the delete action removes the selected block', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })

    await selectBlock(defaultPage, uuid!)
    await clickItemAction(defaultPage, 'delete')

    await expect.poll(() => blockExists(defaultPage, uuid!)).toBe(false)
  })

  test('the Delete shortcut removes the selected block', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })

    await selectBlock(defaultPage, uuid!)
    await pressShortcut(defaultPage, 'Delete')

    await expect.poll(() => blockExists(defaultPage, uuid!)).toBe(false)
  })

  test('without delete permission the action is disabled and clicking is a no-op', async () => {
    const uuid = await addBlock(denyPage, { bundle: 'text' })

    await selectBlock(denyPage, uuid!)

    await expect.poll(() => itemActionDisabled(denyPage, 'delete')).toBe(true)

    // Even forcing the click past the disabled state deletes nothing.
    await itemAction(denyPage, 'delete').click({ force: true })
    await denyPage.waitForTimeout(300)
    expect(await blockExists(denyPage, uuid!)).toBe(true)
  })

  test('without delete permission the Delete shortcut is a no-op', async () => {
    const uuid = await addBlock(denyPage, { bundle: 'text' })
    const countBefore = await blockCount(denyPage)

    await selectBlock(denyPage, uuid!)
    await pressShortcut(denyPage, 'Delete')
    await denyPage.waitForTimeout(300)

    expect(await blockExists(denyPage, uuid!)).toBe(true)
    expect(await blockCount(denyPage)).toBe(countBefore)
  })

  test('the permission override is per-bundle: other bundles stay deletable', async () => {
    // `text` delete is denied, but `title` is untouched and can still be deleted.
    const uuid = await addBlock(denyPage, { bundle: 'title' })

    await selectBlock(denyPage, uuid!)

    await expect.poll(() => itemActionDisabled(denyPage, 'delete')).toBe(false)

    await clickItemAction(denyPage, 'delete')
    await expect.poll(() => blockExists(denyPage, uuid!)).toBe(false)
  })
})
