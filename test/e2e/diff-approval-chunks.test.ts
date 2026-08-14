import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page, Locator } from 'playwright-core'
import { openEditor } from './support/session'
import { addBlock } from './support/blocks'
import { applyChunkFieldDiff, applyDiff, cancelDiff } from './support/diff'
import { openSidebar } from './support/sidebar'
import { setupEditorE2E } from './support/setup'
import { editableState, blockHost, storedFieldValue } from './support/editable'

/**
 * Chunk-level DiffApproval: a rewrite on a markup field that contains multiple
 * top-level blocks (and a `<ul>`) should be reviewable chunk-by-chunk.
 *
 * Each test adds its own `text` block so per-test state doesn't bleed. The
 * playground's `text` field is a `markup` (frame) field; `applyChunkFieldDiff`
 * seeds it with the test's `before` value before opening the DiffApproval, so
 * the segment count is deterministic.
 *
 * Verification is against the editable's rendered text after apply. The mock
 * decorates block elements on read, so the rendered markup carries filter
 * artifacts and only its plain text is meaningful here — the STORED value is
 * asserted separately via `storedFieldValue`, which is what a partial accept
 * actually writes back.
 */
describe('DiffApproval chunk-level approval', async () => {
  await setupEditorE2E()

  let page: Page

  function highlightItems(): Locator {
    return page.locator('[data-test="diff-approval-highlight-item"]')
  }

  function segmentRect(segmentId: string): Locator {
    return page.locator(
      `[data-test="diff-approval-highlight-item"][data-test-segment-id="${segmentId}"]`,
    )
  }

  /** Click a segment's overlay to activate it, then click the toggle pill. */
  async function rejectSegment(segmentId: string): Promise<void> {
    const rect = segmentRect(segmentId)
    await rect.locator('button').first().click() // activate
    await rect.locator('button').nth(1).waitFor({ state: 'visible' }) // toggle pill appears
    await rect.locator('button').nth(1).click() // toggle → reject
    await expect
      .poll(() => rect.getAttribute('data-test-selected'))
      .toBe('false')
  }

  beforeAll(async () => {
    page = await openEditor()
    await openSidebar(page, 'test-cases')
  })

  afterAll(async () => {
    await page.close()
  })

  test('shows one rectangle per atomic chunk for a markup rewrite', async () => {
    const uuid = (await addBlock(page, { bundle: 'text' }))!
    const host = await blockHost(page, uuid)

    const before =
      '<p>Intro</p><ul><li>Bullet A</li><li>Bullet B</li><li>Bullet C</li></ul><p>Outro</p>'
    const after =
      '<p>New intro</p><ul><li>Bullet A new</li><li>Bullet B new</li><li>Bullet C new</li></ul><p>New outro</p>'

    const done = applyChunkFieldDiff(page, {
      fieldName: 'text',
      uuid,
      before,
      after,
    })

    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()

    // 5 chunks: <p>Intro</p>, three <li>, <p>Outro</p>. The <ul> wrapper is
    // not toggleable — it's structure, not a choice.
    await expect.poll(() => highlightItems().count()).toBe(5)
    expect(await highlightItems().first().getAttribute('data-test-kind')).toBe(
      'segment',
    )

    await cancelDiff(page)
    const { applied } = await done
    expect(applied).toBe(false)
    expect((await editableState(page, 'text', host))?.text).toContain(
      'Bullet A',
    )
  })

  test('rejecting one <li> persists the hybrid: original bullet, new everything else', async () => {
    const uuid = (await addBlock(page, { bundle: 'text' }))!
    const host = await blockHost(page, uuid)

    const before =
      '<p>Intro</p><ul><li>Bullet A</li><li>Bullet B</li><li>Bullet C</li></ul><p>Outro</p>'
    const after =
      '<p>New intro</p><ul><li>Bullet A new</li><li>Bullet B new</li><li>Bullet C new</li></ul><p>New outro</p>'

    const done = applyChunkFieldDiff(page, {
      fieldName: 'text',
      uuid,
      before,
      after,
    })

    await page.locator('[data-test="diff-approval-toolbar"]').waitFor()
    await expect.poll(() => highlightItems().count()).toBe(5)

    // Reject the middle <li> — segment id "1/1" (top-level block 1 is the
    // <ul>, child 1 is the second <li>).
    await rejectSegment('1/1')

    await applyDiff(page)
    const { applied } = await done
    expect(applied).toBe(true)

    // After apply: New intro, new A, ORIGINAL B, new C, new outro.
    const textAfter = (await editableState(page, 'text', host))?.text ?? ''
    expect(textAfter).toContain('New intro')
    expect(textAfter).toContain('Bullet A new')
    expect(textAfter).toContain('Bullet B') // original kept
    expect(textAfter).not.toContain('Bullet B new') // rejection landed
    expect(textAfter).toContain('Bullet C new')
    expect(textAfter).toContain('New outro')

    // The rendered check above cannot see what was actually persisted. A
    // partial accept is the one path that still reassembles the field from
    // parsed DOM, so assert the STORED markup exactly: the rejected <li> keeps
    // its original text and nothing picked up the mock's render-time markers.
    expect(await storedFieldValue(page, uuid, 'text')).toBe(
      '<p>New intro</p><ul><li>Bullet A new</li><li>Bullet B</li><li>Bullet C new</li></ul><p>New outro</p>',
    )
  })
})
