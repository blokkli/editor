import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { addBlock } from '../e2e/support/blocks'
import { waitForEditorReady, withApp } from '../e2e/support/session'
import { resetSandbox, sandboxHost, workerSandbox } from './support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from './support/session'

function blockCount(page: Page): Promise<number> {
  return withApp(page, (app) => app.state.getAllUuids().length)
}

describe('Spike: a sandbox per worker, reset per spec file', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page

  beforeAll(async () => {
    console.log(`[${sandbox}] Reset: ${resetSandbox(sandbox).toFixed(1)} ms`)
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
  })

  afterAll(async () => {
    await page.close()
  })

  it('starts from the fixture', async () => {
    expect(await blockCount(page)).toBe(3)
  })

  it('adds a block, which Drupal stores', async () => {
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
    console.log(`[${sandbox}] Reset: ${resetSandbox(sandbox).toFixed(1)} ms`)
    // The reset also ended the session: it lives in the database.
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    expect(await blockCount(page)).toBe(3)
  })
})
