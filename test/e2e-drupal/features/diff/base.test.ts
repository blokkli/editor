import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import { addBlock } from '../../support/blocks'
import { openSidebar } from '../../support/sidebar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

/**
 * The Diff view (the beta feature `diff`) lists the blocks that the edit state
 * changed: it compares the current state with the state without any change,
 * which the adapter loads at history index -1. Unchanged blocks aren't listed.
 * On the page "Blocks" (content/nodes/blocks.yml).
 */

/** Deletes a block through the adapter. */
function deleteBlock(page: Page, uuid: string): Promise<void> {
  return page.evaluate(async (uuid) => {
    const app = window.__BLOKKLI__!.app!
    await app.state.mutateWithLoadingState(() =>
      app.adapter.deleteBlocks!([uuid]),
    )
  }, uuid)
}

/** The blocks that the Diff view lists, with their status. */
function diffItems(page: Page): Promise<Record<string, string | null>> {
  return page
    .locator('[data-test="diff-item"]')
    .evaluateAll((items) =>
      Object.fromEntries(
        items.map((item) => [
          item.getAttribute('data-test-uuid'),
          item.getAttribute('data-test-status'),
        ]),
      ),
    )
}

describe('The Diff view', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      localStorage: {
        'blokkli:feature:settings:settings': JSON.stringify({
          'beta:diff': true,
        }),
      },
    })
  })

  afterAll(async () => {
    await page.close()
  })

  test('lists what was added and deleted', async () => {
    const added = await addBlock(page, { bundle: 'title' })
    const deleted = seedUuid('paragraph', 'second-text')
    await deleteBlock(page, deleted)

    await openSidebar(page, 'diff')

    await expect
      .poll(() => diffItems(page))
      .toEqual({ [added!]: 'added', [deleted]: 'removed' })
  })
})
