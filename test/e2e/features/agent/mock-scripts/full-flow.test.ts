import { afterAll, beforeAll, describe, test } from 'vitest'
import type { Page } from 'playwright-core'
import { openEditor } from '../../../support/session'
import { setupEditorE2E } from '../../../support/setup'
import {
  openAgentPanel,
  setAgentMockScript,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../../support/agent'
import type { MockScript } from '#blokkli/agent/shared/types'

/**
 * Full-flow agent E2E driven by the mock LLM provider.
 *
 * Tool specs in `../tools/` call individual tools directly via `runAgentTool`,
 * bypassing the LLM entirely. This file is the canonical example for tests
 * that exercise the real loop end to end: open sidebar → WebSocket auth →
 * `init` with `mockScript` → server picks the mock provider for this session
 * → user types a prompt → server replays scripted turns → client renders the
 * assistant bubble.
 *
 * The script is the same JSON shape produced by the Transcript panel's "Copy
 * conversation JSON" action, so reproducing a bug from a real conversation is
 * paste-and-go.
 */
describe('agent: full flow via mock provider', async () => {
  await setupEditorE2E()

  let page: Page

  beforeAll(async () => {
    page = await openEditor()
  })

  afterAll(async () => {
    await page.close()
  })

  test('user submits a prompt and sees the scripted assistant reply', async () => {
    const script: MockScript = [
      { type: 'user', content: 'hello' },
      {
        type: 'agent',
        content: [{ type: 'text', text: 'Hi! How can I help?' }],
      },
    ]
    await setAgentMockScript(page, script)
    await openAgentPanel(page)
    await submitAgentPrompt(page, 'hello')
    await waitForAgentReply(page, 'Hi! How can I help?')
  })
})
