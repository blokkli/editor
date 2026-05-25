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
): Promise<{ applied: boolean }> {
  // The `test-cases` feature registers this once its sidebar pane mounts, so
  // the test must `openSidebar(page, 'test-cases')` first. Wait for the actual
  // function (the `.test` object itself exists empty before registration).
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.runDiffApproval === 'function',
  )
  return page.evaluate(() => window.__BLOKKLI__!.test!.runDiffApproval())
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

/** Click the DiffApproval toolbar's Cancel button. */
export function cancelDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-cancel"]').click()
}

/** Click the DiffApproval toolbar's Apply button. */
export function applyDiff(page: Page): Promise<void> {
  return page.locator('[data-test="diff-approval-apply"]').click()
}
