import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import {
  addBlock,
  blockCount,
  selectBlock,
  selectBlocks,
} from '../../support/blocks'
import {
  clickItemAction,
  itemAction,
  itemActionDisabled,
} from '../../support/itemActions'
import { selectedUuids } from '../../support/selection'
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

/** A text, added to the page's paragraphs field. */
const TEXT = { bundle: 'text', fieldName: 'field_paragraphs' }

/** A link of the front page's call to action, whose field holds four at most. */
const FULL_FIELD_LINK = seedUuid('paragraph', 'home-link')

/** The chart and the text of the page "Statistics". */
const CHART = seedUuid('paragraph', 'statistics-chart')
const STATISTICS_TEXT = seedUuid('paragraph', 'statistics-text')

/**
 * The duplicate feature (`features/duplicate/index.vue`) duplicates the selected
 * block(s) in place. Duplicating = adding a copy into the block's own field, so
 * `duplicateDisabledReason` gates the action on BOTH the bundle's `add`
 * permission AND the target field's cardinality. For a multi-selection it
 * disables the whole action if ANY selected block can't be duplicated, even when
 * the others could.
 *
 * We exercise: the happy path (click + Cmd/Ctrl+D shortcut), a block in a full
 * field (a link of the front page's call to action, which holds four at most),
 * the `add` permission (Jonas, a `restricted_editor`, may not add charts), and
 * both "one block blocks the whole selection" cases (cardinality +
 * permission).
 *
 * Assertions are locale-independent: `blockCount`, `selectedUuids`, and the
 * native `disabled` state via `itemActionDisabled` — never the tooltip copy.
 */

/**
 * Page lifecycle: two editor pages opened in parallel — Anna on the front page
 * (`defaultPage`) for tests 1/2/3/5 and Jonas on the page "Statistics"
 * (`denyPage`) for tests 4/6. Each on its own page: the edit state belongs to
 * whoever opens it first, anyone else gets a read-only editor. No test mutates
 * the full call to action or the chart. `afterEach` deselects both pages.
 */
describe('The duplicate feature', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let defaultPage: Page
  let denyPage: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[defaultPage, denyPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en', 'home')),
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

  test('clicking duplicate adds a copy in an unlimited field and selects it', async () => {
    const uuid = await addBlock(defaultPage, TEXT)
    const countBefore = await blockCount(defaultPage)

    await selectBlock(defaultPage, uuid!)
    const duplicated = nextMutation(defaultPage, 'pbDuplicateParagraph')
    await clickItemAction(defaultPage, 'duplicate')
    await duplicated

    await expect.poll(() => blockCount(defaultPage)).toBe(countBefore + 1)
    // The duplicate (a new block, not the original) becomes the selection.
    await expect
      .poll(async () => (await selectedUuids(defaultPage)).length)
      .toBe(1)
    expect((await selectedUuids(defaultPage))[0]).not.toBe(uuid)
  })

  test('the Cmd/Ctrl+D shortcut duplicates the selected block', async () => {
    const uuid = await addBlock(defaultPage, TEXT)
    const countBefore = await blockCount(defaultPage)

    await selectBlock(defaultPage, uuid!)
    const duplicated = nextMutation(defaultPage, 'pbDuplicateParagraph')
    await pressShortcut(defaultPage, 'ControlOrMeta+d')
    await duplicated

    await expect.poll(() => blockCount(defaultPage)).toBe(countBefore + 1)
  })

  test('a block in a full field cannot be duplicated', async () => {
    await selectBlock(defaultPage, FULL_FIELD_LINK)
    // The call to action holds four links at most and already has them.
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
    await selectBlock(denyPage, CHART)
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(true)
  })

  test('a multi-selection is blocked entirely when one block sits in a full field', async () => {
    const text = await addBlock(defaultPage, TEXT)

    // The text on its own is duplicatable.
    await selectBlock(defaultPage, text!)
    await expect
      .poll(() => itemActionDisabled(defaultPage, 'duplicate'))
      .toBe(false)

    // Adding the full field's link to the selection disables the whole action.
    await selectBlocks(defaultPage, [text!, FULL_FIELD_LINK])
    await expect
      .poll(() => itemActionDisabled(defaultPage, 'duplicate'))
      .toBe(true)
  })

  test('a multi-selection is blocked entirely when one block lacks add permission', async () => {
    // The text alone can be duplicated...
    await selectBlock(denyPage, STATISTICS_TEXT)
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(false)

    // ...but adding the chart Jonas may not add disables duplication for the
    // selection.
    await selectBlocks(denyPage, [STATISTICS_TEXT, CHART])
    await expect
      .poll(() => itemActionDisabled(denyPage, 'duplicate'))
      .toBe(true)
  })
})
