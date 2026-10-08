import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addBlock, blockCount } from '../e2e/support/blocks'
import { waitForEditorReady } from '../e2e/support/session'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from './support/session'

describe('The E2E sandbox', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    resetSandbox(sandbox)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  it('starts from the fixture', async () => {
    expect(await blockCount(page)).toBe(3)
  })

  it('stores a new block in Drupal', async () => {
    const response = page.waitForResponse((response) =>
      response.url().includes('/api/graphql_middleware/mutation/'),
    )
    await addBlock(page, { bundle: 'text', fieldName: 'field_paragraphs' })
    expect((await response).ok()).toBe(true)
    expect(await blockCount(page)).toBe(4)

    await page.reload()
    await waitForEditorReady(page)
    expect(await blockCount(page)).toBe(4)
  })

  it('is the fixture again after a reset', async () => {
    await page.close()
    resetSandbox(sandbox)
    // The reset also ended the session: it lives in the database.
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    expect(await blockCount(page)).toBe(3)
  })
})
