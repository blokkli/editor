import { describe, expect, test } from 'vitest'
import { openEditor, withApp } from './support/session'
import { blockCount, dragNewBlockIntoPage } from './support/blocks'
import { nextEditableOpen, plaintextEditor } from './support/editable'
import { setupEditorE2E } from './support/setup'

/**
 * Real drag-and-drop: drag a `text` block from the add-list into the page's
 * content field and assert it is actually added.
 *
 * This exercises blökkli's full pointer-driven drag pipeline (arm from the
 * add-list rail → carry → drop on a field drop zone), not an event-bus
 * shortcut. See `dragNewBlockIntoPage` for the gesture details.
 */
describe('Add block via drag-and-drop', async () => {
  await setupEditorE2E()

  test('dragging a text block from the add-list adds it to the page', async () => {
    const page = await openEditor()

    const before = await blockCount(page)
    await dragNewBlockIntoPage(page, 'text')

    // The drop adds one block.
    await expect.poll(() => blockCount(page)).toBe(before + 1)

    // The newly added block is a `text` block.
    const addedTextBlock = await withApp(page, (app) =>
      app.state
        .getAllUuids()
        .map((uuid) => app.blocks.getBlock(uuid))
        .some((b) => b?.bundle === 'text'),
    )
    expect(addedTextBlock).toBe(true)

    await page.close()
  })

  test('dragging a title block adds it and auto-opens its editable (addBehaviour: editable:title)', async () => {
    const page = await openEditor()

    // Capture the editable:open event the addBehaviour should fire after the
    // drop. Started (not awaited) before the drag so the listener is in place.
    const editableOpened = nextEditableOpen(page)

    const before = await blockCount(page)
    await dragNewBlockIntoPage(page, 'title')

    await expect.poll(() => blockCount(page)).toBe(before + 1)

    // addBehaviour: 'editable:title' auto-opens the title field's editor.
    // First: the open intent was dispatched for the right field (pinpoints a
    // failure between "event never fired" and "fired but editor didn't open").
    expect(await editableOpened).toBe('title')

    // Then the outcome the user actually relies on: the editor is really open —
    // visible and focused, so they can type immediately. (The event alone does
    // not prove the editable element was found and mounted.)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    expect(await editor.evaluate((el) => el === document.activeElement)).toBe(
      true,
    )

    await page.close()
  })
})
