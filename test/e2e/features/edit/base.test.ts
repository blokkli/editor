import { describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { EDITOR_PATH, openEditor, withApp } from './../../support/session'
import { setupEditorE2E } from './../../support/setup'
import { addBlock, selectBlock, selectBlocks } from './../../support/blocks'
import {
  clickItemAction,
  itemActionDisabled,
} from './../../support/itemActions'
import { nextEvent } from './../../support/events'
import { formOverlay } from './../../support/overlays'
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

describe('The edit feature', async () => {
  await setupEditorE2E()

  test('clicking edit on an editable block emits item:edit and opens the form', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    const edited = nextEvent(page, 'item:edit')
    await clickItemAction(page, 'edit')

    expect(await edited).toEqual({ uuid, bundle: 'text' })
    await formOverlay(page, 'edit-form').waitFor({ state: 'visible' })

    await page.close()
  })

  test('the Cmd/Ctrl+E shortcut triggers edit', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    const edited = nextEvent(page, 'item:edit')
    await pressShortcut(page, 'ControlOrMeta+e')

    expect(await edited).toEqual({ uuid, bundle: 'text' })

    await page.close()
  })

  test('double-clicking a block triggers edit', async () => {
    const page = await openEditor()
    const uuid = await addBlock(page, { bundle: 'text' })

    const edited = nextEvent(page, 'item:edit')
    await doubleClickBlock(page, uuid!)

    expect(await edited).toEqual({ uuid, bundle: 'text' })

    await page.close()
  })

  test('a multi-selection disables editing', async () => {
    const page = await openEditor()
    const first = await addBlock(page, { bundle: 'text' })
    const second = await addBlock(page, { bundle: 'text' })

    // The edit action has no `multiple`, so selecting more than one disables it.
    await selectBlocks(page, [first!, second!])
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)

    await page.close()
  })

  test('without edit permission, editing is disabled', async () => {
    const page = await openEditor(EDITOR_PATH, {
      permissions: { blockPermissions: { text: ['add', 'delete'] } },
    })
    const uuid = await addBlock(page, { bundle: 'text' })

    await selectBlock(page, uuid!)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)

    await page.close()
  })

  test('a block type with disableEdit is not editable', async () => {
    const page = await openEditor()
    // `two_columns` sets `editor.disableEdit` and has no complex option.
    const uuid = await addBlock(page, { bundle: 'two_columns' })

    await selectBlock(page, uuid!)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)

    await page.close()
  })

  test('a fragment block cannot be edited', async () => {
    const page = await openEditor()
    // The playground seeds non-feature fragments, which are never editable.
    const fragmentUuid = await withApp(
      page,
      (app) =>
        app.blocks
          .getAllBlocks()
          .find((block) => block.bundle === 'blokkli_fragment')?.uuid ?? null,
    )
    expect(fragmentUuid).toBeTruthy()

    await selectBlock(page, fragmentUuid!)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)

    await page.close()
  })
})
