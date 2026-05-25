import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor, withApp } from './../support/session'
import { setupEditorE2E } from './../support/setup'
import { addBlock, blockCount, selectBlock } from './../support/blocks'
import { itemAction, clickItemAction } from './../support/itemActions'

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
 * Assertions are locale-independent: block presence via `withApp`, counts via
 * `blockCount`, and the native `disabled` state via `isDisabled()` — never the
 * translated tooltip copy.
 */

/** Whether a block is still present in the editor state. */
function blockExists(page: Page, uuid: string): Promise<boolean> {
  return page.evaluate(
    (u) => !!window.__BLOKKLI__!.app!.blocks.getBlock(u),
    uuid,
  )
}

/**
 * Trigger the delete keyboard shortcut. The shortcut only dispatches while the
 * canvas is focused (the keyboard provider gates on it), so focus it first —
 * same approach as `support/clipboard.ts`.
 */
async function pressDeleteShortcut(page: Page): Promise<void> {
  await withApp(page, (app) => app.ui.setCanvasFocused(true))
  await page.keyboard.press('Delete')
}

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
    await pressDeleteShortcut(page)

    await expect.poll(() => blockExists(page, uuid!)).toBe(false)

    await page.close()
  })

  test('without delete permission the action is disabled and clicking is a no-op', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TEXT_DELETE)
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)

    const button = itemAction(page, 'delete')
    await expect.poll(() => button.isDisabled()).toBe(true)

    // Even forcing the click past the disabled state deletes nothing.
    await button.click({ force: true })
    await page.waitForTimeout(300)
    expect(await blockExists(page, uuid!)).toBe(true)

    await page.close()
  })

  test('without delete permission the Delete shortcut is a no-op', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TEXT_DELETE)
    const uuid = await addBlock(page, { bundle: 'text' })
    const countBefore = await blockCount(page)

    await selectBlock(page, uuid!)
    await pressDeleteShortcut(page)
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

    const button = itemAction(page, 'delete')
    await expect.poll(() => button.isDisabled()).toBe(false)

    await clickItemAction(page, 'delete')
    await expect.poll(() => blockExists(page, uuid!)).toBe(false)

    await page.close()
  })
})
