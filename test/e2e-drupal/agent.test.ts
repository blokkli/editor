import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  openAgentPanel,
  submitAgentPrompt,
  waitForAgentReply,
} from './support/agent'
import { applyDiff } from './support/diff'
import {
  waitForEditorReady,
  BLOCKS_EDITOR_PATH,
  openEditor,
} from './support/session'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from './support/sandbox'

describe('The agent', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page | undefined

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  afterEach(async () => {
    await page?.close()
  })

  it('answers from its script', async () => {
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: [
        { type: 'user', content: 'Hello' },
        {
          type: 'agent',
          content: [{ type: 'text', text: 'Hello from the script.' }],
        },
      ],
    })
    await openAgentPanel(page)
    await submitAgentPrompt(page, 'Hello')
    await waitForAgentReply(page, 'Hello from the script.')
  })

  it('rewrites a text with the scripted stream, which Drupal stores', async () => {
    const uuid = seedUuid('paragraph', 'first-text')
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: [
        { type: 'routing', tools: ['delegate_text_rewrite'] },
        { type: 'user', content: 'Shorten the first text.' },
        {
          type: 'agent',
          content: [
            {
              type: 'tool_use',
              id: 'tu_rewrite',
              name: 'delegate_text_rewrite',
              input: {
                request: { template: 'rewrite', instruction: 'Shorten it.' },
                fields: [{ uuid, fieldName: 'field_text' }],
              },
            },
          ],
        },
        {
          type: 'stream',
          content: '[[[FIELD:0]]]\n[[[FULL]]]\n<p>Rewritten text.</p>',
        },
        { type: 'agent', content: [{ type: 'text', text: 'Shortened.' }] },
      ],
    })
    await openAgentPanel(page)
    await submitAgentPrompt(page, 'Shorten the first text.')
    await applyDiff(page)
    await waitForAgentReply(page, 'Shortened.')

    const block = page.locator(`[data-bk-uuid="${uuid}"]`).first()
    expect(await block.textContent()).toContain('Rewritten text.')
    await page.reload()
    await waitForEditorReady(page)
    expect(await block.textContent()).toContain('Rewritten text.')
  })
})
