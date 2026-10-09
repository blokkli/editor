import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import { openEditor } from './support/session'
import { addBlock } from './support/blocks'
import { cancelDiff, runFieldsDiffApproval } from './support/diff'
import { openSidebar } from './support/sidebar'
import { setupEditorE2E } from './support/setup'

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
 *
 * The other cases run against Drupal (`test/e2e-drupal/diff-approval-grouping`);
 * these two follow once the sandbox has a paragraph type with a bound field
 * next to an element-less one.
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
})
