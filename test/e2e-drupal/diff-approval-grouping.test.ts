import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import type { Locator, Page } from 'playwright-core'
import {
  applyDiff,
  cancelDiff,
  runFieldsDiffApproval,
} from '../e2e/support/diff'
import { openSidebar } from '../e2e/support/sidebar'
import { runComponentTool } from '../e2e/support/agent'
import { storedFieldValue } from '../e2e/support/editable'
import { countMutations, nextMutation } from './support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'
import { editorPath, openEditor } from './support/session'

// The page "Reading" (content/nodes/reading.yml): its teaser renders its title
// and lead without an element of their own, its text with one.
const TEASER = seedUuid('paragraph', 'reading-teaser')
const TEXT = seedUuid('paragraph', 'reading-text')

// A widget of the page "Widgets" (content/nodes/widgets.yml): its title is
// bound to an element, its text (`field_lead`) is only prop-mapped.
const WIDGET = seedUuid('paragraph', 'widgets-first')

/**
 * Highlights for fields that have no editable element of their own.
 *
 * Such a field can only be drawn on an enclosing element — the block. Before
 * grouping, every one of them got its own block-sized rectangle: they stacked on
 * the same spot, indistinguishable from each other, and the topmost one
 * swallowed the clicks meant for any field nested inside it.
 *
 * `runFieldsDiffApproval` resolves fields from the editable field CONFIG, so
 * unlike the other scenarios it can target fields without an element.
 *
 * Page lifecycle: two pages, opened in parallel: the page "Reading" (`page`)
 * and the page "Widgets" (`widgetPage`), for a bound field next to an
 * element-less one on the same paragraph.
 */
describe('DiffApproval grouping', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let widgetPage: Page
  let fieldSaves: () => number

  function rects(target: Page): Locator {
    return target.locator('[data-test="diff-approval-highlight-item"]')
  }

  function rectOfKind(target: Page, kind: 'whole' | 'group'): Locator {
    return target.locator(
      `[data-test="diff-approval-highlight-item"][data-test-kind="${kind}"]`,
    )
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[page, widgetPage] = await Promise.all([
      openEditor(sandbox, 'Anna Keller', editorPath('/en/reading', 'reading')),
      openEditor(sandbox, 'Anna Keller', editorPath('/en/widgets', 'widgets')),
    ])
    fieldSaves = countMutations(page, 'pbUpdateFieldValue')
    await Promise.all([
      openSidebar(page, 'test-cases'),
      openSidebar(widgetPage, 'test-cases'),
    ])
  })

  afterAll(async () => {
    await Promise.all([page.close(), widgetPage.close()])
  })

  // A scenario left open would still have its rectangles on the canvas when the
  // next test counts them, so make a failure fail only its own test.
  afterEach(async () => {
    for (const target of [page, widgetPage]) {
      const cancel = target.locator('[data-test="diff-approval-cancel"]')
      if (await cancel.count()) {
        await cancel.click()
      }
      await expect.poll(() => rects(target).count()).toBe(0)
    }
  })

  test('an element-less field gets one group rect beside the anchored field', async () => {
    const done = runFieldsDiffApproval(widgetPage, {
      uuid: WIDGET,
      fields: [
        { fieldName: 'field_title', value: 'Grouping title' },
        { fieldName: 'field_lead', value: 'Grouping text' },
      ],
    })
    await widgetPage.locator('[data-test="diff-approval-toolbar"]').waitFor()

    await expect.poll(() => rects(widgetPage).count()).toBe(2)
    // `field_title` has its own element; `field_lead` falls back to the block.
    expect(await rectOfKind(widgetPage, 'whole').count()).toBe(1)
    expect(await rectOfKind(widgetPage, 'group').count()).toBe(1)
    expect(
      await rectOfKind(widgetPage, 'group').getAttribute('data-test-fallback'),
    ).toBe('true')

    await cancelDiff(widgetPage)
    expect((await done).applied).toBe(false)
  })

  // The reported bug: the block-sized rect covers the title's rect, so clicking
  // the title always activated the block instead. Nesting has to win.
  test('clicking a nested field rect activates it, not the enclosing block rect', async () => {
    const done = runFieldsDiffApproval(widgetPage, {
      uuid: WIDGET,
      fields: [
        { fieldName: 'field_title', value: 'Click-priority title' },
        { fieldName: 'field_lead', value: 'Click-priority text' },
      ],
    })
    await widgetPage.locator('[data-test="diff-approval-toolbar"]').waitFor()
    await expect.poll(() => rects(widgetPage).count()).toBe(2)

    // Make the block-level group active first, via the keyboard so no click is
    // involved — otherwise this assertion could pass on the initial selection.
    await widgetPage.keyboard.press('ArrowDown')
    await expect
      .poll(() =>
        rectOfKind(widgetPage, 'group').getAttribute('data-test-active'),
      )
      .toBe('true')

    // The title's rectangle lies inside the block's, which is painted first and
    // so sits underneath. The click must reach the title.
    await rectOfKind(widgetPage, 'whole').locator('button').first().click()
    await expect
      .poll(() =>
        rectOfKind(widgetPage, 'whole').getAttribute('data-test-active'),
      )
      .toBe('true')
    expect(
      await rectOfKind(widgetPage, 'group').getAttribute('data-test-active'),
    ).toBe('false')

    await cancelDiff(widgetPage)
    expect((await done).applied).toBe(false)
  })

  test('two element-less fields on one block merge into a single stop', async () => {
    const done = runFieldsDiffApproval(page, {
      uuid: TEASER,
      fields: [
        { fieldName: 'field_title', value: 'Merged title' },
        { fieldName: 'field_lead', value: 'Merged lead' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()

    // Neither field has an element, so there is exactly one thing to decide —
    // not two rectangles stacked on the same spot.
    await expect.poll(() => rects(page).count()).toBe(1)
    expect(await rects(page).getAttribute('data-test-kind')).toBe('group')
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

    // The teaser previews both values through its props mapping.
    const teaser = page.locator(`[data-bk-uuid="${TEASER}"]`)
    await expect.poll(() => teaser.textContent()).toContain('Merged title')
    expect(await teaser.textContent()).toContain('Merged lead')

    // The scenario stores the fields one after the other.
    const lead = nextMutation(
      page,
      'pbUpdateFieldValue',
      (v) => v.fieldName === 'field_lead',
    )
    await applyDiff(page)
    expect((await done).applied).toBe(true)
    await lead

    // One decision, both fields written.
    expect(await storedFieldValue(page, TEASER, 'field_title')).toBe(
      'Merged title',
    )
    expect(await storedFieldValue(page, TEASER, 'field_lead')).toBe(
      'Merged lead',
    )
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
    const stored = nextMutation(page, 'pbBulkUpdateFieldValues')
    await runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid: TEXT,
          fieldName: 'field_text',
          value: '<p>Alpha</p><p>Beta</p>',
        },
      ],
      requireApproval: false,
    })
    await stored

    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid: TEXT,
          fieldName: 'field_text',
          value: '<p>Alpha</p>\n<p>Beta</p>',
        },
      ],
    })

    // The toolbar has to appear at all — that is the regression.
    await page
      .locator('[data-test="diff-approval-toolbar"]')
      .waitFor({ state: 'visible' })
    await expect.poll(() => rects(page).count()).toBe(1)
    // Whole-field, not a chunk: there is no changed chunk to point at.
    expect(await rects(page).getAttribute('data-test-kind')).toBe('whole')

    await cancelDiff(page)
    await done
  })

  test('rejecting the merged stop writes neither field', async () => {
    const before = {
      title: await storedFieldValue(page, TEASER, 'field_title'),
      lead: await storedFieldValue(page, TEASER, 'field_lead'),
    }
    const saves = fieldSaves()

    const done = runFieldsDiffApproval(page, {
      uuid: TEASER,
      fields: [
        { fieldName: 'field_title', value: 'Rejected title' },
        { fieldName: 'field_lead', value: 'Rejected lead' },
      ],
    })
    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()
    await expect.poll(() => rects(page).count()).toBe(1)

    // One Space rejects everything behind the stop.
    await page.keyboard.press('Space')
    await expect
      .poll(() => rects(page).getAttribute('data-test-selected'))
      .toBe('false')

    await applyDiff(page)
    expect((await done).applied).toBe(true)

    expect(fieldSaves()).toBe(saves)
    expect(await storedFieldValue(page, TEASER, 'field_title')).toBe(
      before.title,
    )
    expect(await storedFieldValue(page, TEASER, 'field_lead')).toBe(before.lead)
  })
})
