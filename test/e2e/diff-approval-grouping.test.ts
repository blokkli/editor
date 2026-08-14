import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from './support/session'
import { addBlock } from './support/blocks'
import { applyDiff, cancelDiff, runFieldsDiffApproval } from './support/diff'
import { openSidebar } from './support/sidebar'
import { runComponentTool } from './support/agent'
import { setupEditorE2E } from './support/setup'
import { storedFieldValue } from './support/editable'

/**
 * Highlights for fields that have no editable element of their own.
 *
 * Such a field can only be drawn on an enclosing element — the block. Before
 * grouping, every one of them got its own block-sized rectangle: they stacked on
 * the same spot, indistinguishable from each other, and the topmost one
 * swallowed the clicks meant for any field nested inside it.
 *
 * The playground `card` is the fixture: `title` carries `v-blokkli-editable`,
 * `text` is prop-mapped only. `runFieldsDiffApproval` resolves fields from the
 * editable field CONFIG, so unlike the other scenarios it can target `text`.
 */
describe('DiffApproval grouping', async () => {
  await setupEditorE2E()

  let page: Page

  function rects(): Locator {
    return page.locator('[data-test="diff-approval-highlight-item"]')
  }

  function rectOfKind(kind: 'whole' | 'group'): Locator {
    return page.locator(
      `[data-test="diff-approval-highlight-item"][data-test-kind="${kind}"]`,
    )
  }

  async function addCard(): Promise<string> {
    const uuid = await addBlock(page, { bundle: 'card', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add card block')
    await page.locator(`[data-bk-uuid="${uuid}"]`).waitFor()
    return uuid
  }

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  // A scenario left open would still have its rectangles on the canvas when the
  // next test counts them, so make a failure fail only its own test.
  afterEach(async () => {
    const cancel = page.locator('[data-test="diff-approval-cancel"]')
    if (await cancel.count()) {
      await cancel.click()
    }
    await expect.poll(() => rects().count()).toBe(0)
  })

  test('an element-less field gets one group rect beside the anchored field', async () => {
    const uuid = await addCard()

    const done = runFieldsDiffApproval(page, {
      uuid,
      fields: [
        { fieldName: 'title', value: 'Grouping title' },
        { fieldName: 'text', value: 'Grouping text' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()

    await expect.poll(() => rects().count()).toBe(2)
    // `title` has its own element; `text` falls back to the block.
    expect(await rectOfKind('whole').count()).toBe(1)
    expect(await rectOfKind('group').count()).toBe(1)
    expect(await rectOfKind('group').getAttribute('data-test-fallback')).toBe(
      'true',
    )

    await cancelDiff(page)
    expect((await done).applied).toBe(false)
  })

  // The reported bug: the block-sized rect covers the title's rect, so clicking
  // the title always activated the block instead. Nesting has to win.
  test('clicking a nested field rect activates it, not the enclosing block rect', async () => {
    const uuid = await addCard()

    const done = runFieldsDiffApproval(page, {
      uuid,
      fields: [
        { fieldName: 'title', value: 'Click-priority title' },
        { fieldName: 'text', value: 'Click-priority text' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()
    await expect.poll(() => rects().count()).toBe(2)

    // Make the block-level group active first, via the keyboard so no click is
    // involved — otherwise this assertion could pass on the initial selection.
    await page.keyboard.press('ArrowDown')
    await expect
      .poll(() => rectOfKind('group').getAttribute('data-test-active'))
      .toBe('true')

    // The title's rectangle lies inside the block's, which is painted first and
    // so sits underneath. The click must reach the title.
    await rectOfKind('whole').locator('button').first().click()
    await expect
      .poll(() => rectOfKind('whole').getAttribute('data-test-active'))
      .toBe('true')
    expect(await rectOfKind('group').getAttribute('data-test-active')).toBe(
      'false',
    )

    await cancelDiff(page)
    expect((await done).applied).toBe(false)
  })

  test('two element-less fields on one block merge into a single stop', async () => {
    const uuid = await addBlock(page, {
      bundle: 'card_plain',
      fieldName: 'content',
    })
    if (!uuid) throw new Error('Failed to add card_plain block')
    await page.locator(`[data-bk-uuid="${uuid}"]`).waitFor()

    const done = runFieldsDiffApproval(page, {
      uuid,
      fields: [
        { fieldName: 'title', value: 'Merged title' },
        { fieldName: 'text', value: 'Merged text' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()

    // Neither field has an element, so there is exactly one thing to decide —
    // not two rectangles stacked on the same spot.
    await expect.poll(() => rects().count()).toBe(1)
    expect(await rects().getAttribute('data-test-kind')).toBe('group')
    expect(
      await page
        .locator('[data-test="diff-approval-toolbar"]')
        .getAttribute('data-test-unit-kind'),
    ).toBe('group')

    // And the toolbar counts it once.
    const toolbarText = await page
      .locator('[data-test="diff-approval-toolbar"]')
      .textContent()
    expect(toolbarText).toContain('1 / 1')

    await applyDiff(page)
    expect((await done).applied).toBe(true)

    // One decision, both fields written.
    await expect
      .poll(() => storedFieldValue(page, uuid, 'title'))
      .toBe('Merged title')
    expect(await storedFieldValue(page, uuid, 'text')).toBe('Merged text')
  })

  // Not about grouping, but about the invariant grouping depends on: a stop
  // must never be empty, because "every unit accepted" is vacuously true for
  // no units at all.
  //
  // Segmentation parses both values into blocks, which drops the whitespace
  // between them — so a value differing ONLY there passes the tool's
  // "unchanged?" check and then yields segments with no changed chunk. Without
  // the `segmentsHaveChanges` guard that produces an item with zero units: no
  // rectangle, no toolbar, and a tool call that can never be completed.
  test('a whitespace-only change still offers something to approve', async () => {
    const uuid = await addBlock(page, { bundle: 'text', fieldName: 'content' })
    if (!uuid) throw new Error('Failed to add text block')

    await runComponentTool(page, 'update_text_fields', {
      updates: [{ uuid, fieldName: 'text', value: '<p>Alpha</p><p>Beta</p>' }],
      requireApproval: false,
    })

    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        { uuid, fieldName: 'text', value: '<p>Alpha</p>\n<p>Beta</p>' },
      ],
    })

    // The toolbar has to appear at all — that is the regression.
    await page
      .locator('[data-test="diff-approval-toolbar"]')
      .waitFor({ state: 'visible' })
    await expect.poll(() => rects().count()).toBe(1)
    // Whole-field, not a chunk: there is no changed chunk to point at.
    expect(await rects().getAttribute('data-test-kind')).toBe('whole')

    await cancelDiff(page)
    await done
  })

  test('rejecting the merged stop writes neither field', async () => {
    const uuid = await addBlock(page, {
      bundle: 'card_plain',
      fieldName: 'content',
    })
    if (!uuid) throw new Error('Failed to add card_plain block')
    await page.locator(`[data-bk-uuid="${uuid}"]`).waitFor()

    const before = {
      title: await storedFieldValue(page, uuid, 'title'),
      text: await storedFieldValue(page, uuid, 'text'),
    }

    const done = runFieldsDiffApproval(page, {
      uuid,
      fields: [
        { fieldName: 'title', value: 'Rejected title' },
        { fieldName: 'text', value: 'Rejected text' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()
    await expect.poll(() => rects().count()).toBe(1)

    // One Space rejects everything behind the stop.
    await page.keyboard.press('Space')
    await expect
      .poll(() => rects().getAttribute('data-test-selected'))
      .toBe('false')

    await applyDiff(page)
    expect((await done).applied).toBe(true)

    expect(await storedFieldValue(page, uuid, 'title')).toBe(before.title)
    expect(await storedFieldValue(page, uuid, 'text')).toBe(before.text)
  })
})
