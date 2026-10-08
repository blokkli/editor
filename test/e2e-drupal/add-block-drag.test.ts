import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { withApp } from '../e2e/support/session'
import {
  blockCount,
  blockState,
  dragNewBlockIntoPage,
} from '../e2e/support/blocks'
import {
  editableOverlay,
  nextEditableOpen,
  plaintextEditor,
  saveByClickAway,
} from '../e2e/support/editable'
import { nextMutation } from './support/mutations'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from './support/session'

/**
 * Real drag-and-drop: drag blocks from the add-list into the page's
 * `field_paragraphs` and assert they are actually added.
 *
 * This exercises blökkli's full pointer-driven drag pipeline (arm from the
 * add-list rail → carry → drop on a field drop zone), not an event-bus
 * shortcut. See `dragNewBlockIntoPage` for the gesture details.
 *
 * Page lifecycle: one editor page is opened in `beforeAll` and shared across
 * both tests. Each test captures its own `before` state, so the accumulating
 * state doesn't matter to the per-test assertion. Both `text` and `title` have
 * `addBehaviour: 'editable:<field>'`, so each drag leaves an editable overlay
 * mounted that would intercept pointer input from a subsequent drag —
 * `afterEach` closes it with a click away. Escape wouldn't: the text's
 * `field_text` is edited in a frame, which has no Escape handler in the editor's
 * document. Closing an unchanged overlay saves nothing.
 */
describe('Add block via drag-and-drop', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await editableOverlay(page).isVisible()) {
      await saveByClickAway(page)
      await editableOverlay(page).waitFor({ state: 'detached' })
    }
  })

  test('dragging a text block from the add-list adds it to the page', async () => {
    const before = await withApp(page, (app) => app.state.getAllUuids())
    const added = nextMutation(page, 'pbAddParagraph')
    await dragNewBlockIntoPage(page, 'text', { fieldName: 'field_paragraphs' })

    // The drop adds one block.
    expect(await added).toMatchObject({ type: 'text' })
    await expect.poll(() => blockCount(page)).toBe(before.length + 1)

    // The new block is a `text` (the page already has texts, so find it).
    const uuid = (await withApp(page, (app) => app.state.getAllUuids())).find(
      (uuid) => !before.includes(uuid),
    )
    expect(uuid).toBeDefined()
    expect((await blockState(page, uuid!)).bundle).toBe('text')
  })

  test('dragging a title block adds it and auto-opens its editable (addBehaviour: editable:field_title)', async () => {
    // Capture the editable:open event the addBehaviour should fire after the
    // drop. Started (not awaited) before the drag so the listener is in place.
    const editableOpened = nextEditableOpen(page)

    const before = await blockCount(page)
    const added = nextMutation(page, 'pbAddParagraph')
    await dragNewBlockIntoPage(page, 'title', {
      fieldName: 'field_paragraphs',
    })

    expect(await added).toMatchObject({ type: 'title' })
    await expect.poll(() => blockCount(page)).toBe(before + 1)

    // addBehaviour: 'editable:field_title' auto-opens the title field's
    // editor. First: the open intent was dispatched for the right field
    // (pinpoints a failure between "event never fired" and "fired but editor
    // didn't open").
    expect(await editableOpened).toBe('field_title')

    // Then the outcome the user actually relies on: the editor is really open —
    // visible and focused, so they can type immediately. (The event alone does
    // not prove the editable element was found and mounted.)
    const editor = plaintextEditor(page)
    await editor.waitFor({ state: 'visible' })
    expect(await editor.evaluate((el) => el === document.activeElement)).toBe(
      true,
    )
  })
})
