import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { selectBlock } from '../../support/blocks'
import { itemAction } from '../../support/itemActions'
import { topLevelBlockUuids } from '../../support/selection'
import { resetSandbox, sandboxHost, workerSandbox } from '../../support/sandbox'
import { editorPath, openEditor, withApp } from '../../support/session'
import { openSidebar } from '../../support/sidebar'

/**
 * Who may read comments but not post them gets no way to post: Drupal refuses
 * it (`post blokkli comments`), and the editor would lose what they typed. Who
 * administers comments (`administer blokkli_comment`) may do everything, also
 * with other people's comments, even without the permissions to view or post.
 *
 * Three reviewers on the page "Feedback" with its seeded threads (none of them
 * theirs), side by side: Marc may post, Sara (the test module's role
 * `comment_reader`) may not, David (`comment_administrator`) administers them.
 * What one has shows that the check for another isn't vacuous.
 */
describe('Comment permissions', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  const path = editorPath('/en/feedback', 'feedback')
  let marc: Page
  let sara: Page
  let david: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    ;[marc, sara, david] = await Promise.all([
      openEditor(sandbox, 'Marc Brunner', path),
      openEditor(sandbox, 'Sara Gerber', path),
      openEditor(sandbox, 'David Meier', path),
    ])
  })

  afterAll(async () => {
    await Promise.all([marc.close(), sara.close(), david.close()])
  })

  function bannerMode(page: Page): Promise<string | null> {
    return page
      .locator('[data-test="view-only-banner"]')
      .getAttribute('data-test-mode')
  }

  function count(page: Page, dataTest: string): Promise<number> {
    return page.locator(`[data-test="${dataTest}"]`).count()
  }

  test('the banner tells who may comment', async () => {
    expect(await bannerMode(marc)).toBe('review')
    expect(await bannerMode(sara)).toBe('view')
    expect(await bannerMode(david)).toBe('review')
  })

  test('the sidebar offers adding, replying and resolving only to who may post', async () => {
    await Promise.all(
      [marc, sara, david].map((page) => openSidebar(page, 'comments')),
    )

    for (const page of [marc, david]) {
      await page.locator('[data-test="comments-sidebar-add-button"]').waitFor()
      expect(await count(page, 'comment-reply-button')).toBeGreaterThan(0)
      expect(await count(page, 'comment-action-resolve')).toBeGreaterThan(0)
    }

    // Sara reads the same threads.
    await sara.locator('[data-test="comment-thread"]').first().waitFor()
    for (const control of [
      'comments-sidebar-add-button',
      'comment-reply-button',
      'comment-action-resolve',
    ]) {
      expect(await count(sara, control)).toBe(0)
    }
  })

  test("only who administers comments may change other people's", async () => {
    // The sidebar is open since the previous test.
    expect(await count(marc, 'comment-action-edit')).toBe(0)
    expect(await count(marc, 'comment-action-delete')).toBe(0)
    expect(await count(david, 'comment-action-edit')).toBeGreaterThan(0)
    expect(await count(david, 'comment-action-delete')).toBeGreaterThan(0)

    // Drupal stores David's change to someone else's comment.
    const marker = 'ADMINISTERED_' + Date.now()
    const thread = david.locator('[data-test="comment-thread"]').first()
    await thread.locator('[data-test="comment-action-edit"]').first().click()
    const form = thread.locator('[data-test="comment-input"]')
    await form.locator('[data-test="richtext-editor"]').click()
    await david.keyboard.press('ControlOrMeta+a')
    await david.keyboard.type(marker)
    await form.locator('[data-test="comment-input-submit"]').click()
    await expect
      .poll(() =>
        withApp(david, async (app) =>
          ((await app.adapter.loadComments!()) as { body: string }[]).map(
            (c) => c.body,
          ),
        ),
      )
      .toContainEqual(expect.stringContaining(marker))
  })

  test('the action to comment on paragraphs shows only to who may post', async () => {
    for (const page of [marc, sara, david]) {
      await selectBlock(page, (await topLevelBlockUuids(page))[0]!)
      await page.locator('[data-test="item-actions-dropdown-toggle"]').waitFor()
    }

    expect(await itemAction(marc, 'add_comment').count()).toBe(1)
    expect(await itemAction(sara, 'add_comment').count()).toBe(0)
    expect(await itemAction(david, 'add_comment').count()).toBe(1)
  })
})
