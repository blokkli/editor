import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Page } from 'playwright-core'
import type { MockScript } from '#blokkli/agent/shared/types'
import {
  openAgentPanel,
  runComponentTool,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../support/agent'
import { cancelDiff } from '../../support/diff'
import { openSidebar } from '../../support/sidebar'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'
import {
  CANARY_WORD,
  canariesRan,
  canaryRawHtml,
  canaryText,
  installCanary,
} from '../../support/xss'

// The first text of the page "Blocks" (content/nodes/blocks.yml).
const TEXT = seedUuid('paragraph', 'first-text')

/**
 * X2 and X4 (plans/xss), for what the model writes. A prompt injection (in
 * the page's content, a fetched page, pasted text) can make the model write the
 * payload; the mock script stands in for it.
 *
 * - X2: the chat renders markdown with `marked`, which keeps raw HTML, into
 *   `v-html`: the model's reply, and the user's own prompt.
 * - X4: `update_text_fields` previews its value in the page before anyone
 *   approves it: it writes the diff into the paragraph with `innerHTML`. Its
 *   split (`splitIntoSegments()`) parsed the value in the live document too,
 *   until X6's fix.
 *
 * The rewrite runs first: it needs the `test-cases` sidebar, which the agent's
 * panel replaces.
 */
describe('XSS canary: what the agent writes (X2, X4)', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page
  let prompt: string

  beforeAll(async () => {
    resetSandbox(sandbox)
    prompt = canaryText('agent-prompt')
    const script: MockScript = [
      { type: 'user', content: prompt },
      {
        type: 'agent',
        content: [{ type: 'text', text: canaryText('agent-reply') }],
      },
    ]
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: script,
    })
    await installCanary(page)
  })

  afterAll(async () => {
    await page.close()
  })

  test("a rewrite's preview runs its value before approval", async () => {
    await openSidebar(page, 'test-cases')
    const done = runComponentTool(page, 'update_text_fields', {
      updates: [
        {
          uuid: TEXT,
          fieldName: 'field_text',
          value: canaryRawHtml('agent-rewrite'),
        },
      ],
    })
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'visible' })

    try {
      // Runs today. The fix flips this to `not.toContain`.
      await expect.poll(() => canariesRan(page)).toContain('agent-rewrite')
    } finally {
      // Ends the tool, whatever the check found.
      await cancelDiff(page)
      await done
    }
  })

  test('the chat shows the prompt as markup', async () => {
    await openAgentPanel(page)
    await submitAgentPrompt(page, prompt)

    // Runs today. The fix flips this to `not.toContain`.
    await expect.poll(() => canariesRan(page)).toContain('agent-prompt')
  })

  test("the chat shows the model's reply as markup", async () => {
    await waitForAgentReply(page, CANARY_WORD)

    // Runs today. The fix flips this to `not.toContain`.
    await expect.poll(() => canariesRan(page)).toContain('agent-reply')
  })
})
