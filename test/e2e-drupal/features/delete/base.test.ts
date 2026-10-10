import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  addBlock,
  blockCount,
  blockExists,
  selectBlock,
} from '../../support/blocks'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from '../../support/itemActions'
import { pressShortcut } from '../../support/keyboard'
import { emitEvent } from '../../support/events'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import { nextMutation } from '../../support/mutations'

/** The chart of the page "Statistics", which Jonas may not delete. */
const CHART = seedUuid('paragraph', 'statistics-chart')

/**
 * The delete feature (`features/delete/index.vue`) renders a `delete` item
 * action (and a `Delete` keyboard shortcut) that removes the selected block(s).
 * Both paths go through the same handler, which is gated by the block bundle's
 * `delete` permission: when denied, the action button is natively `disabled`
 * and the handler early-returns, so neither clicking nor pressing Delete does
 * anything.
 *
 * Permissions come from the adapter's `getAllBundles()`, per user: Jonas, a
 * `restricted_editor`, may not delete charts (nor add them), but may delete
 * any other paragraph type.
 *
 * Assertions are locale-independent: block presence via `blockExists`, counts
 * via `blockCount`, and the native `disabled` state via `itemActionDisabled` —
 * never the translated tooltip copy.
 */

/**
 * Page lifecycle: two editor pages are opened in parallel in `beforeAll` —
 * Anna on the page "Empty" (`defaultPage`, used by tests 1 & 2) and Jonas on
 * the page "Statistics", which has a chart (`denyPage`, used by tests 3, 4, &
 * 5). Each test that deletes picks a fresh uuid via `addBlock`, so the
 * accumulating blocks between tests are irrelevant. `afterEach` deselects on
 * both pages.
 */
describe('The delete feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let defaultPage: Page
  let denyPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[defaultPage, denyPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en/empty', 'empty')),
      openEditor(
        sandbox,
        'Jonas Weber',
        editorPath('/en/statistics', 'statistics'),
      ),
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
    const uuid = await addBlock(defaultPage, {
      bundle: 'text',
      fieldName: 'field_paragraphs',
    })

    await selectBlock(defaultPage, uuid!)
    const deleted = nextMutation(defaultPage, 'pbDeleteMultipleParagraphs')
    await clickItemAction(defaultPage, 'delete')
    await deleted

    await expect.poll(() => blockExists(defaultPage, uuid!)).toBe(false)
  })

  test('the Delete shortcut removes the selected block', async () => {
    const uuid = await addBlock(defaultPage, {
      bundle: 'text',
      fieldName: 'field_paragraphs',
    })

    await selectBlock(defaultPage, uuid!)
    const deleted = nextMutation(defaultPage, 'pbDeleteMultipleParagraphs')
    await pressShortcut(defaultPage, 'Delete')
    await deleted

    await expect.poll(() => blockExists(defaultPage, uuid!)).toBe(false)
  })

  test('without delete permission the action is disabled and clicking is a no-op', async () => {
    await selectBlock(denyPage, CHART)

    await expect.poll(() => itemActionDisabled(denyPage, 'delete')).toBe(true)

    // Even forcing the click past the disabled state deletes nothing.
    await itemAction(denyPage, 'delete').click({ force: true })
    await denyPage.waitForTimeout(300)
    expect(await blockExists(denyPage, CHART)).toBe(true)
  })

  test('without delete permission the Delete shortcut is a no-op', async () => {
    const countBefore = await blockCount(denyPage)

    await selectBlock(denyPage, CHART)
    await pressShortcut(denyPage, 'Delete')
    await denyPage.waitForTimeout(300)

    expect(await blockExists(denyPage, CHART)).toBe(true)
    expect(await blockCount(denyPage)).toBe(countBefore)
  })

  test('the permission is per-bundle: other bundles stay deletable', async () => {
    // Deleting charts is denied, but Jonas may add and delete a title.
    const uuid = await addBlock(denyPage, {
      bundle: 'title',
      fieldName: 'field_paragraphs',
    })

    await selectBlock(denyPage, uuid!)

    await expect.poll(() => itemActionDisabled(denyPage, 'delete')).toBe(false)

    const deleted = nextMutation(denyPage, 'pbDeleteMultipleParagraphs')
    await clickItemAction(denyPage, 'delete')
    await deleted
    await expect.poll(() => blockExists(denyPage, uuid!)).toBe(false)
  })
})
