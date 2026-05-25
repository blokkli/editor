import { describe, expect, test } from 'vitest'
import { EDITOR_PATH, openEditor } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import {
  addBlock,
  blockCount,
  blockExists,
  selectBlock,
} from './../support/blocks'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from './../support/itemActions'
import { pressShortcut } from './../support/keyboard'

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

describe('The delete feature', async () => {
  await setupEditorE2E()

  test('clicking the delete action removes the selected block', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    await clickItemAction(page, 'delete')

    await expect.poll(() => blockExists(page, uuid!)).toBe(false)

    await page.close()
  })

  test('the Delete shortcut removes the selected block', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    await pressShortcut(page, 'Delete')

    await expect.poll(() => blockExists(page, uuid!)).toBe(false)

    await page.close()
  })

  test('without delete permission the action is disabled and clicking is a no-op', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TEXT_DELETE)
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)

    await expect.poll(() => itemActionDisabled(page, 'delete')).toBe(true)

    // Even forcing the click past the disabled state deletes nothing.
    await itemAction(page, 'delete').click({ force: true })
    await page.waitForTimeout(300)
    expect(await blockExists(page, uuid!)).toBe(true)

    await page.close()
  })

  test('without delete permission the Delete shortcut is a no-op', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TEXT_DELETE)
    const uuid = await addBlock(page, { bundle: 'text' })
    const countBefore = await blockCount(page)

    await selectBlock(page, uuid!)
    await pressShortcut(page, 'Delete')
    await page.waitForTimeout(300)

    expect(await blockExists(page, uuid!)).toBe(true)
    expect(await blockCount(page)).toBe(countBefore)

    await page.close()
  })

  test('the permission override is per-bundle: other bundles stay deletable', async () => {
    // `text` delete is denied, but `title` is untouched and can still be deleted.
    const page = await openEditor(EDITOR_PATH, DENY_TEXT_DELETE)
    const uuid = await addBlock(page, { bundle: 'title' })

    await selectBlock(page, uuid!)

    await expect.poll(() => itemActionDisabled(page, 'delete')).toBe(false)

    await clickItemAction(page, 'delete')
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)

    await page.close()
  })
})
