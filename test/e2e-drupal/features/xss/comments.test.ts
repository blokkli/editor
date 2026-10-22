import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openSidebar } from '../../support/sidebar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import {
  BLOCKS_EDITOR_PATH,
  openEditor,
  waitForEditorReady,
} from '../../support/session'
import {
  CANARY_WORD,
  canaryRawHtml,
  installCanary,
  resetCanary,
  settledCanaries,
  storeComment,
} from '../../support/xss'

// The first text of the page "Blocks" (content/nodes/blocks.yml).
const TEXT = seedUuid('paragraph', 'first-text')

/**
 * X3 (plans/xss): Drupal stores a comment's body as it gets it, and returned
 * the raw value (`getBody()`), although it's stored with the format
 * `blokkli_comment`. The sidebar renders it with `v-html`. Drupal now returns
 * the body as the format filters it (`getProcessedBody()`). The comment editor
 * doesn't produce such a body: the spec sends it through the adapter, as a
 * request made by hand would.
 */
describe('XSS canary: comment bodies (X3)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    await installCanary(page)
    await storeComment(page, [TEXT], canaryRawHtml('comment'))
    // The comments are loaded when the editor starts.
    await page.reload()
    await waitForEditorReady(page)
  })

  afterAll(async () => {
    await page.close()
  })

  test('the sidebar shows the body without running it', async () => {
    await resetCanary(page)
    await openSidebar(page, 'comments')
    const comment = page.locator('[data-test="comment"]').first()
    await expect
      .poll(async () => (await comment.textContent()) ?? '')
      .toContain(CANARY_WORD)

    expect(await settledCanaries(page)).not.toContain('comment')
  })
})
