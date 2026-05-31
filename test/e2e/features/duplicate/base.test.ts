import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import {
  addBlock,
  addBlocks,
  blockCount,
  selectBlock,
  selectBlocks,
} from './../../support/blocks'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from './../../support/itemActions'
import { selectedUuids } from './../../support/selection'
import { pressShortcut } from './../../support/keyboard'

/**
 * The duplicate feature (`features/duplicate/index.vue`) duplicates the selected
 * block(s) in place. Duplicating = adding a copy into the block's own field, so
 * `duplicateDisabledReason` gates the action on BOTH the bundle's `add`
 * permission AND the target field's cardinality. For a multi-selection it
 * disables the whole action if ANY selected block can't be duplicated, even when
 * the others could.
 *
 * We exercise: the happy path (click + Cmd/Ctrl+D shortcut), a block in a full
 * cardinality-1 field (a title inside a `grid.header`, which holds at most one),
 * the `add` permission (reusing the generic `{ permissions }` override —
 * `playground/app/mock/permissionOverrides.ts`), and both "one block blocks the
 * whole selection" cases (cardinality + permission).
 *
 * Assertions are locale-independent: `blockCount`, `selectedUuids`, and the
 * native `disabled` state via `itemActionDisabled` — never the German tooltip
 * copy. Blocks are built per-test with `addBlock`/
 * `addBlocks`, so nothing depends on the seeded page contents.
 */

/** Override that denies adding (hence duplicating) `title` blocks. */
const DENY_TITLE_ADD = {
  permissions: { blockPermissions: { title: ['edit', 'delete'] } },
}

/**
 * Add a grid whose cardinality-1 `header` field already holds a title — so the
 * header is full and its title can't be duplicated. Returns the title's uuid.
 */
async function addFullGridHeaderTitle(page: Page): Promise<string> {
  const headerTitle = 'e2e-dup-header'
  await addBlocks(page, [
    {
      bundle: 'grid',
      uuid: 'e2e-dup-grid',
      children: { header: [{ bundle: 'title', uuid: headerTitle }] },
    },
  ])
  return headerTitle
}

describe('The duplicate feature', async () => {
  await setupEditorE2E()

  test('clicking duplicate adds a copy in an unlimited field and selects it', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })
    const countBefore = await blockCount(page)

    await selectBlock(page, uuid!)
    await clickItemAction(page, 'duplicate')

    await expect.poll(() => blockCount(page)).toBe(countBefore + 1)
    // The duplicate (a new block, not the original) becomes the selection.
    const selected = await selectedUuids(page)
    expect(selected).toHaveLength(1)
    expect(selected[0]).not.toBe(uuid)

    await page.close()
  })

  test('the Cmd/Ctrl+D shortcut duplicates the selected block', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })
    const countBefore = await blockCount(page)

    await selectBlock(page, uuid!)
    await pressShortcut(page, 'ControlOrMeta+d')

    await expect.poll(() => blockCount(page)).toBe(countBefore + 1)

    await page.close()
  })

  test('a block in a full cardinality-1 field cannot be duplicated', async () => {
    const page = await openEditor()
    const headerTitle = await addFullGridHeaderTitle(page)

    await selectBlock(page, headerTitle)
    // The grid header holds at most one block and already has it.
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(true)

    // Even forcing the click past the disabled state duplicates nothing.
    const countBefore = await blockCount(page)
    await itemAction(page, 'duplicate').click({ force: true })
    await page.waitForTimeout(300)
    expect(await blockCount(page)).toBe(countBefore)

    await page.close()
  })

  test('without add permission, duplicate is disabled', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TITLE_ADD)
    const uuid = await addBlock(page, { bundle: 'title' })

    await selectBlock(page, uuid!)
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(true)

    await page.close()
  })

  test('a multi-selection is blocked entirely when one block sits in a full field', async () => {
    const page = await openEditor()
    const headerTitle = await addFullGridHeaderTitle(page)
    const text = await addBlock(page, { bundle: 'text' })

    // The content text on its own is duplicatable.
    await selectBlock(page, text!)
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(false)

    // Adding the full-header title to the selection disables the whole action.
    await selectBlocks(page, [text!, headerTitle])
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(true)

    await page.close()
  })

  test('a multi-selection is blocked entirely when one block lacks add permission', async () => {
    const page = await openEditor(EDITOR_PATH, DENY_TITLE_ADD)
    const text = await addBlock(page, { bundle: 'text' })
    const title = await addBlock(page, { bundle: 'title' })

    // The text alone can be duplicated...
    await selectBlock(page, text!)
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(false)

    // ...but adding the add-denied title disables duplication for the selection.
    await selectBlocks(page, [text!, title!])
    await expect.poll(() => itemActionDisabled(page, 'duplicate')).toBe(true)

    await page.close()
  })
})
