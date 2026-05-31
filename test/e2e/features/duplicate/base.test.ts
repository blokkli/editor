import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
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
import { emitEvent } from './../../support/events'

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

/**
 * Page lifecycle: two editor pages opened in parallel — `defaultPage` for
 * tests 1/2/3/5 and `denyPage` (with `DENY_TITLE_ADD`) for tests 4/6.
 * Permissions are seeded into localStorage before init, so a page per
 * permission set is cheaper than reloading. `addFullGridHeaderTitle` uses
 * hardcoded uuids and can only run once per page, so the grid + header title
 * are seeded in `beforeAll` on `defaultPage` and the resulting
 * `sharedHeaderTitle` uuid is reused by tests 3 and 5 (neither test mutates
 * the grid: test 3 force-clicks a no-op, test 5 only multi-selects).
 * `afterEach` deselects both pages.
 */
describe('The duplicate feature', async () => {
  await setupEditorE2E()

  let defaultPage: Page
  let denyPage: Page
  let sharedHeaderTitle: string

  beforeAll(async () => {
    ;[defaultPage, denyPage] = await Promise.all([
      openEditor(),
      openEditor(EDITOR_PATH, DENY_TITLE_ADD),
    ])
    sharedHeaderTitle = await addFullGridHeaderTitle(defaultPage)
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

  test('clicking duplicate adds a copy in an unlimited field and selects it', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })
    const countBefore = await blockCount(defaultPage)

    await selectBlock(defaultPage, uuid!)
    await clickItemAction(defaultPage, 'duplicate')

    await expect.poll(() => blockCount(defaultPage)).toBe(countBefore + 1)
    // The duplicate (a new block, not the original) becomes the selection.
    const selected = await selectedUuids(defaultPage)
    expect(selected).toHaveLength(1)
    expect(selected[0]).not.toBe(uuid)
  })

  test('the Cmd/Ctrl+D shortcut duplicates the selected block', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })
    const countBefore = await blockCount(defaultPage)

    await selectBlock(defaultPage, uuid!)
    await pressShortcut(defaultPage, 'ControlOrMeta+d')

    await expect.poll(() => blockCount(defaultPage)).toBe(countBefore + 1)
  })

  test('a block in a full cardinality-1 field cannot be duplicated', async () => {
    await selectBlock(defaultPage, sharedHeaderTitle)
    // The grid header holds at most one block and already has it.
    await expect
      .poll(() => itemActionDisabled(defaultPage, 'duplicate'))
      .toBe(true)

    // Even forcing the click past the disabled state duplicates nothing.
    const countBefore = await blockCount(defaultPage)
    await itemAction(defaultPage, 'duplicate').click({ force: true })
    await defaultPage.waitForTimeout(300)
    expect(await blockCount(defaultPage)).toBe(countBefore)
  })

  test('without add permission, duplicate is disabled', async () => {
    const uuid = await addBlock(denyPage, { bundle: 'title' })

    await selectBlock(denyPage, uuid!)
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(true)
  })

  test('a multi-selection is blocked entirely when one block sits in a full field', async () => {
    const text = await addBlock(defaultPage, { bundle: 'text' })

    // The content text on its own is duplicatable.
    await selectBlock(defaultPage, text!)
    await expect
      .poll(() => itemActionDisabled(defaultPage, 'duplicate'))
      .toBe(false)

    // Adding the full-header title to the selection disables the whole action.
    await selectBlocks(defaultPage, [text!, sharedHeaderTitle])
    await expect
      .poll(() => itemActionDisabled(defaultPage, 'duplicate'))
      .toBe(true)
  })

  test('a multi-selection is blocked entirely when one block lacks add permission', async () => {
    const text = await addBlock(denyPage, { bundle: 'text' })
    const title = await addBlock(denyPage, { bundle: 'title' })

    // The text alone can be duplicated...
    await selectBlock(denyPage, text!)
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(false)

    // ...but adding the add-denied title disables duplication for the selection.
    await selectBlocks(denyPage, [text!, title!])
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(true)
  })
})
