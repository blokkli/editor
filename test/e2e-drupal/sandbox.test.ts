import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runAgentTool } from './support/agent'
import { addBlock, blockCount } from './support/blocks'
import {
  waitForEditorReady,
  BLOCKS_EDITOR_PATH,
  openEditor,
  revertAllChanges,
} from './support/session'
import { openSidebar } from './support/sidebar'
import { nextMutation } from './support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'

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

  it("leaves Drupal's GraphQL endpoint to Nuxt's server", async () => {
    // The editor asks nuxt-graphql-middleware, whose server asks Drupal from
    // inside the container. nginx refuses the endpoint to the browser.
    const answers = await page.evaluate(() =>
      Promise.all(
        ['/graphql', '/en/graphql'].map(async (path) => {
          const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '{ __typename }' }),
          })
          return `${response.status} ${response.headers.get('x-blokkli-upstream')}`
        }),
      ),
    )
    expect(answers).toEqual(['403 nginx', '403 nginx'])
  })

  it('has the test cases', async () => {
    await openSidebar(page, 'test-cases')
    const result = await runAgentTool(page, 'get_all_page_content', {})
    expect(result.content.map((paragraph) => paragraph.bundle)).toEqual([
      'title',
      'text',
      'text',
    ])
    const firstText = result.content.find(
      (paragraph) => paragraph.uuid === seedUuid('paragraph', 'first-text'),
    )
    expect(firstText?.text).toContain('First text.')
  })

  it('stores a new block in Drupal', async () => {
    const variables = nextMutation(page, 'pbAddParagraph')
    await addBlock(page, { bundle: 'text', fieldName: 'field_paragraphs' })
    expect(await variables).toMatchObject({
      type: 'text',
      hostFieldName: 'field_paragraphs',
    })
    expect(await blockCount(page)).toBe(4)

    await page.reload()
    await waitForEditorReady(page)
    expect(await blockCount(page)).toBe(4)
  })

  it('reverts all changes', async () => {
    await revertAllChanges(page)
    expect(await blockCount(page)).toBe(3)

    await page.reload()
    await waitForEditorReady(page)
    expect(await blockCount(page)).toBe(3)
  })

  it('is the fixture again after a reset', async () => {
    await addBlock(page, { bundle: 'text', fieldName: 'field_paragraphs' })
    await page.close()
    resetSandbox(sandbox)
    // The reset also ended the session: it lives in the database.
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH)
    expect(await blockCount(page)).toBe(3)
  })
})
