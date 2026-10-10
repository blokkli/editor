import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock, selectBlocks } from '../../../e2e/support/blocks'
import {
  clickItemAction,
  itemActionDisabled,
} from '../../../e2e/support/itemActions'
import { emitEvent, nextEvent } from '../../../e2e/support/events'
import { closeFormOverlay, formOverlay } from '../../../e2e/support/overlays'
import { pressShortcut } from '../../../e2e/support/keyboard'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'

// The front page (content/nodes/home.yml).
const TEXT = seedUuid('paragraph', 'home-text')
const CALL_TO_ACTION = seedUuid('paragraph', 'home-call-to-action')
const COLUMNS = seedUuid('paragraph', 'home-columns')
const FRAGMENT = seedUuid('paragraph', 'home-fragment')

/**
 * The edit feature (`features/edit/index.vue`) decides whether the selected
 * paragraph can be edited and, on activation (click, Cmd/Ctrl+E, or
 * double-click), emits `item:edit { uuid, bundle }` — which the edit-form
 * feature turns into the `form-overlay-edit-form` overlay (Drupal's paragraph
 * form). It gates on: single-selection only (the action has no `multiple`, so
 * >1 selected disables it), the type's `edit` permission, a definition's
 * `editor.disableEdit` (e.g. `columns`), and fragments (non-feature fragments
 * aren't editable).
 *
 * We assert on the `item:edit` payload (the feature's actual output, captured
 * with `nextEvent`), the `form-overlay-edit-form` data-test, and the native
 * `disabled` state via `itemActionDisabled` — never translated copy.
 *
 * The case without edit permission stays with the mock
 * (`test/e2e/features/edit/base`) until a test user lacks one.
 */

/**
 * Double-click a paragraph — emits `item:doubleClick` with the live field-list
 * item, the upstream event the edit feature turns into `item:edit`.
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
 * Page lifecycle: one editor page on the front page; nothing is changed, so
 * the tests share its seeded paragraphs. `afterEach` closes the edit-form
 * overlay (test 1 leaves it open) and deselects.
 */
describe('The edit feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', editorPath('/en', 'home'))
  })

  afterAll(async () => {
    await page.close()
  })

  afterEach(async () => {
    if (await formOverlay(page, 'edit-form').isVisible()) {
      await closeFormOverlay(page, 'edit-form')
    }
    await emitEvent(page, 'select:unselect')
  })

  test('clicking edit on an editable block emits item:edit and opens the form', async () => {
    await selectBlock(page, TEXT)
    const edited = nextEvent(page, 'item:edit')
    await clickItemAction(page, 'edit')

    expect(await edited).toEqual({ uuid: TEXT, bundle: 'text' })
    await formOverlay(page, 'edit-form').waitFor({ state: 'visible' })
  })

  test('the Cmd/Ctrl+E shortcut triggers edit', async () => {
    await selectBlock(page, TEXT)
    const edited = nextEvent(page, 'item:edit')
    await pressShortcut(page, 'ControlOrMeta+e')

    expect(await edited).toEqual({ uuid: TEXT, bundle: 'text' })
  })

  test('double-clicking a block triggers edit', async () => {
    const edited = nextEvent(page, 'item:edit')
    await doubleClickBlock(page, TEXT)

    expect(await edited).toEqual({ uuid: TEXT, bundle: 'text' })
  })

  test('a multi-selection disables editing', async () => {
    // Both are editable on their own; the edit action has no `multiple`, so
    // selecting more than one disables it.
    await selectBlocks(page, [TEXT, CALL_TO_ACTION])
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)
  })

  test('a block type with disableEdit is not editable', async () => {
    // `columns` sets `editor.disableEdit` and has no complex option.
    await selectBlock(page, COLUMNS)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)
  })

  test('a fragment block cannot be edited', async () => {
    // "Frequently searched" (`quick_links`) is the sandbox's own fragment,
    // not a feature's, so it's never editable.
    await selectBlock(page, FRAGMENT)
    await expect.poll(() => itemActionDisabled(page, 'edit')).toBe(true)
  })
})
