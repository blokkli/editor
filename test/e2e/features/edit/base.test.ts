import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock, selectBlock, selectBlocks } from './../../support/blocks'
import {
  clickItemAction,
  itemActionDisabled,
} from './../../support/itemActions'
import { emitEvent, nextEvent } from './../../support/events'
import { closeFormOverlay, formOverlay } from './../../support/overlays'
import { pressShortcut } from './../../support/keyboard'

/**
 * The edit feature (`features/edit/index.vue`) decides whether the selected
 * block can be edited and, on activation (click, Cmd/Ctrl+E, or double-click),
 * emits `item:edit { uuid, bundle }` — which the edit-form feature turns into the
 * `form-overlay-edit-form` overlay. It gates on: single-selection only (the
 * action has no `multiple`, so >1 selected disables it), the bundle's `edit`
 * permission, a definition's `editor.disableEdit` (e.g. `two_columns`), and
 * fragments (non-feature fragments aren't editable).
 *
 * We assert on the `item:edit` payload (the feature's actual output, captured
 * with `nextEvent`), the `form-overlay-edit-form` data-test, and the native
 * `disabled` state via `itemActionDisabled` — never translated copy. The `edit`
 * permission is denied with the generic `{ permissions }` override
 * (`playground/app/mock/permissionOverrides.ts`).
 */

/**
 * Double-click a block — emits `item:doubleClick` with the live field-list item,
 * the upstream event the edit feature turns into `item:edit`.
 */
function doubleClickBlock(page: Page, uuid: string): Promise<void> {
  return page.evaluate((u) => {
    const app = window.__BLOKKLI__!.app!
    const block = app.blocks.getBlock(u)
    if (block) {
      app.eventBus.emit('item:doubleClick', block)
    }
  }, uuid)
}

/**
 * Page lifecycle: two editor pages opened in parallel — `defaultPage` for
 * the six tests on default permissions and `denyPage` for the one test that
 * needs `text` edit permission denied. Each test adds its own block (or
 * picks the seeded fragment for test 7), so accumulating blocks don't matter.
 * `afterEach` closes the edit-form overlay (test 1 leaves it open) and
 * deselects on both pages.
 */
describe('The edit feature', async () => {
  await setupEditorE2E()

  let defaultPage: Page
  let denyPage: Page

  beforeAll(async () => {
    ;[defaultPage, denyPage] = await Promise.all([
      openEditor(),
      openEditor(EDITOR_PATH, {
        permissions: { blockPermissions: { text: ['add', 'delete'] } },
      }),
    ])
  })

  afterAll(async () => {
    await Promise.all([defaultPage.close(), denyPage.close()])
  })

  afterEach(async () => {
    if (await formOverlay(defaultPage, 'edit-form').isVisible()) {
      await closeFormOverlay(defaultPage, 'edit-form')
    }
    await Promise.all([
      emitEvent(defaultPage, 'select:unselect'),
      emitEvent(denyPage, 'select:unselect'),
    ])
  })

  test('clicking edit on an editable block emits item:edit and opens the form', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })

    await selectBlock(defaultPage, uuid!)
    const edited = nextEvent(defaultPage, 'item:edit')
    await clickItemAction(defaultPage, 'edit')

    expect(await edited).toEqual({ uuid, bundle: 'text' })
    await formOverlay(defaultPage, 'edit-form').waitFor({ state: 'visible' })
  })

  test('the Cmd/Ctrl+E shortcut triggers edit', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })

    await selectBlock(defaultPage, uuid!)
    const edited = nextEvent(defaultPage, 'item:edit')
    await pressShortcut(defaultPage, 'ControlOrMeta+e')

    expect(await edited).toEqual({ uuid, bundle: 'text' })
  })

  test('double-clicking a block triggers edit', async () => {
    const uuid = await addBlock(defaultPage, { bundle: 'text' })

    const edited = nextEvent(defaultPage, 'item:edit')
    await doubleClickBlock(defaultPage, uuid!)

    expect(await edited).toEqual({ uuid, bundle: 'text' })
  })

  test('a multi-selection disables editing', async () => {
    const first = await addBlock(defaultPage, { bundle: 'text' })
    const second = await addBlock(defaultPage, { bundle: 'text' })

    // The edit action has no `multiple`, so selecting more than one disables it.
    await selectBlocks(defaultPage, [first!, second!])
    await expect.poll(() => itemActionDisabled(defaultPage, 'edit')).toBe(true)
  })

  test('without edit permission, editing is disabled', async () => {
    const uuid = await addBlock(denyPage, { bundle: 'text' })

    await selectBlock(denyPage, uuid!)
    await expect.poll(() => itemActionDisabled(denyPage, 'edit')).toBe(true)
  })

  test('a block type with disableEdit is not editable', async () => {
    // `two_columns` sets `editor.disableEdit` and has no complex option.
    const uuid = await addBlock(defaultPage, { bundle: 'two_columns' })

    await selectBlock(defaultPage, uuid!)
    await expect.poll(() => itemActionDisabled(defaultPage, 'edit')).toBe(true)
  })

  test('a fragment block cannot be edited', async () => {
    // The playground seeds non-feature fragments, which are never editable.
    const fragmentUuid = await withApp(
      defaultPage,
      (app) =>
        app.blocks
          .getAllBlocks()
          .find((block) => block.bundle === 'blokkli_fragment')?.uuid ?? null,
    )
    expect(fragmentUuid).toBeTruthy()

    await selectBlock(defaultPage, fragmentUuid!)
    await expect.poll(() => itemActionDisabled(defaultPage, 'edit')).toBe(true)
  })
})
