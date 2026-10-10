import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { itemAction } from '../../support/itemActions'
import { topLevelBlockUuids } from '../../support/selection'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor } from '../../support/session'
import { openSidebar } from '../../support/sidebar'

/**
 * Who may read comments but not post them gets no way to post: Drupal refuses
 * it (`post blokkli comments`), and the editor would lose what they typed.
 *
 * Two reviewers on the page "Feedback" with its seeded threads, side by side:
 * Marc may post, Sara (the role `comment_reader` of the test module) may not.
 * What Marc has shows that the check for Sara isn't vacuous.
 */
describe('Comment permissions', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  const path = editorPath('/en/feedback', 'feedback')
  let marc: Page
  let sara: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[marc, sara] = await Promise.all([
      openEditor(sandbox, 'Marc Brunner', path),
      openEditor(sandbox, 'Sara Gerber', path),
    ])
  })

  afterAll(async () => {
    await Promise.all([marc.close(), sara.close()])
  })

  function bannerMode(page: Page): Promise<string | null> {
    return page
      .locator('[data-test="view-only-banner"]')
      .getAttribute('data-test-mode')
  }

  test('the banner tells who may comment', async () => {
    expect(await bannerMode(marc)).toBe('review')
    expect(await bannerMode(sara)).toBe('view')
  })

  test('the sidebar offers adding, replying and resolving only to who may post', async () => {
    await Promise.all([
      openSidebar(marc, 'comments'),
      openSidebar(sara, 'comments'),
    ])

    await marc.locator('[data-test="comments-sidebar-add-button"]').waitFor()
    expect(
      await marc.locator('[data-test="comment-reply-button"]').count(),
    ).toBeGreaterThan(0)
    expect(
      await marc.locator('[data-test="comment-action-resolve"]').count(),
    ).toBeGreaterThan(0)

    // Sara reads the same threads.
    await sara.locator('[data-test="comment-thread"]').first().waitFor()
    for (const control of [
      'comments-sidebar-add-button',
      'comment-reply-button',
      'comment-action-resolve',
    ]) {
      expect(await sara.locator(`[data-test="${control}"]`).count()).toBe(0)
    }
  })

  test('the action to comment on paragraphs shows only to who may post', async () => {
    for (const page of [marc, sara]) {
      await selectBlock(page, (await topLevelBlockUuids(page))[0]!)
      await page.locator('[data-test="item-actions-dropdown-toggle"]').waitFor()
    }

    expect(await itemAction(marc, 'add_comment').count()).toBe(1)
    expect(await itemAction(sara, 'add_comment').count()).toBe(0)
  })
})
