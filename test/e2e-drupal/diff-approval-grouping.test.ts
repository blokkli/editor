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

/**
 * Highlights for fields that have no editable element of their own.
 *
 * Such a field can only be drawn on an enclosing element — the block. Before
 * grouping, every one of them got its own block-sized rectangle: they stacked on
 * the same spot, indistinguishable from each other, and the topmost one
 * swallowed the clicks meant for any field nested inside it.
 *
 * `runFieldsDiffApproval` resolves fields from the editable field CONFIG, so
 * unlike the other scenarios it can target fields without an element. The
 * cases with a bound field next to an element-less one on the same paragraph
 * stay in the mock suite until the sandbox has a paragraph type with both.
 */
describe('DiffApproval grouping', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let fieldSaves: () => number

  function rects(): Locator {
    return page.locator('[data-test="diff-approval-highlight-item"]')
  }

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(
      sandbox,
      'Anna Keller',
      editorPath('/en/reading', 'reading'),
    )
    fieldSaves = countMutations(page, 'pbUpdateFieldValue')
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
    await expect.poll(() => rects().count()).toBe(1)
    // Whole-field, not a chunk: there is no changed chunk to point at.
    expect(await rects().getAttribute('data-test-kind')).toBe('whole')

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
    await expect.poll(() => rects().count()).toBe(1)

    // One Space rejects everything behind the stop.
    await page.keyboard.press('Space')
    await expect
      .poll(() => rects().getAttribute('data-test-selected'))
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
