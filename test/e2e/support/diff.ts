import type { Page } from 'playwright-core'

/**
 * Trigger the diff-approval test scenario (host title + lead + a card title).
 *
 * Returns a promise that resolves once the preview is applied or cancelled, so
 * tests can fire it, interact (assert markup, click apply/cancel), then await
 * the result:
 *
 * ```ts
 * const done = runDiffApproval(page)
 * // ...assert the diff markup is present...
 * await cancelDiff(page)
 * const { applied } = await done
 * ```
 */
export async function runDiffApproval(
  page: Page,
  opts?: { reverseOrder?: boolean },
): Promise<{ applied: boolean }> {
  // The `test-cases` feature registers this once its sidebar pane mounts, so
  // the test must `openSidebar(page, 'test-cases')` first. Wait for the actual
  // function (the `.test` object itself exists empty before registration).
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.runDiffApproval === 'function',
  )
  return page.evaluate(
    (opts) => window.__BLOKKLI__!.test!.runDiffApproval(opts),
    opts,
  )
}

/**
 * Show a single-field diff whose apply performs a REAL mutation (persists
 * `value` via the adapter). Resolves on apply/cancel — fire, click apply, await.
 * Omit `uuid` for a host-entity field.
 */
export async function applyFieldDiff(
  page: Page,
  fieldName: string,
  value: string,
  uuid?: string,
): Promise<{ applied: boolean }> {
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.applyFieldDiff === 'function',
  )
  return page.evaluate(
    ({ fieldName, value, uuid }) =>
      window.__BLOKKLI__!.test!.applyFieldDiff({ fieldName, value, uuid }),
    { fieldName, value, uuid },
  )
}

/**
 * Seed the field with `before`, then drive a chunk-level DiffApproval whose
 * segments come from `splitIntoSegments(before, after, 'markup')`. Applying
 * persists the reassembled hybrid value. Resolves on apply/cancel.
 *
 * The `data-test="diff-approval-highlight-item"` rectangles each carry a
 * `data-test-kind="segment"` attribute the test can use to assert per-chunk
 * highlights.
 */
export async function applyChunkFieldDiff(
  page: Page,
  args: { fieldName: string; uuid?: string; before: string; after: string },
): Promise<{ applied: boolean }> {
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.applyChunkFieldDiff === 'function',
  )
  return page.evaluate(
    (args) => window.__BLOKKLI__!.test!.applyChunkFieldDiff(args),
    args,
  )
}

/**
 * Drive a DiffApproval for named fields, resolved from the editable field
 * config rather than the rendered editable elements — the only way to target a
 * field that has no element of its own. Applying persists every accepted field.
 * Resolves on apply/cancel. Omit `uuid` for host-entity fields.
 */
export async function runFieldsDiffApproval(
  page: Page,
  args: { uuid?: string; fields: Array<{ fieldName: string; value: string }> },
): Promise<{ applied: boolean }> {
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.runFieldsDiffApproval === 'function',
  )
  return page.evaluate(
    (args) => window.__BLOKKLI__!.test!.runFieldsDiffApproval(args),
    args,
  )
}

/** Click the DiffApproval toolbar's Cancel button. */
export function cancelDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-cancel"]').click()
}

/** Click the DiffApproval toolbar's Edit button (manual revision). */
export function editDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-edit"]').click()
}

/**
 * Click the Edit button on the active highlight pill (the in-canvas entry
 * point). The button renders per unit but is only shown for the active one,
 * hence the `:visible` filter.
 */
export function editDiffFromHighlight(page: Page): Promise<void> {
  return page
    .locator('[data-test="diff-approval-highlight-edit"]:visible')
    .click()
}

/** Click the DiffApproval toolbar's Apply button. */
export function applyDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-apply"]').click()
}
