import { setup } from '@nuxt/test-utils/e2e'
import type { Page } from 'playwright-core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { MockScript } from '#blokkli/agent/shared/types'
import {
  openAgentPanel,
  submitAgentPrompt,
  waitForAgentReply,
} from '../../support/agent'
import { applyDiff } from '../../support/diff'
import { nextMutation } from '../../support/mutations'
import {
  resetSandbox,
  sandboxHost,
  seedUuid,
  workerSandbox,
} from '../../support/sandbox'
import { BLOCKS_EDITOR_PATH, openEditor } from '../../support/session'

// The title of the page "Blocks" (content/nodes/blocks.yml), which holds 255
// characters.
const TITLE = seedUuid('paragraph', 'first-title')

// The tokens that the scripted stream reports. The scripted conversation
// reports none, so the conversation's usage is the stream's.
const USAGE = { inputTokens: 1200, outputTokens: 340 }

/** A conversation that rewrites the title with `value`, then replies. */
function rewriteScript(value: string, reply: string): MockScript {
  return [
    { type: 'routing', tools: ['delegate_text_rewrite'] },
    { type: 'user', content: 'Rewrite the title.' },
    {
      type: 'agent',
      content: [
        {
          type: 'tool_use',
          id: 'tu_rewrite',
          name: 'delegate_text_rewrite',
          input: {
            request: { template: 'rewrite', instruction: 'Rewrite it.' },
            fields: [{ uuid: TITLE, fieldName: 'field_title' }],
          },
        },
      ],
    },
    {
      type: 'stream',
      content: `[[[FIELD:0]]]\n[[[FULL]]]\n${value}`,
      usage: USAGE,
    },
    { type: 'agent', content: [{ type: 'text', text: reply }] },
  ]
}

/** Open the rewrite's approval, as the agent's first turn leads to it. */
async function startRewrite(page: Page): Promise<void> {
  await openAgentPanel(page)
  await submitAgentPrompt(page, 'Rewrite the title.')
  await page
    .locator('[data-test="diff-approval-apply"]')
    .waitFor({ state: 'visible' })
}

/** The conversation's token counts, in the agent's menu "Show more". */
async function expectTokenUsage(
  page: Page,
  expected: typeof USAGE,
): Promise<void> {
  await page.locator('[data-test="agent-more"]').click()
  const usage = page.locator('[data-test="agent-token-usage"]')
  await usage.waitFor({ state: 'visible' })
  await expect
    .poll(async () => ({
      inputTokens: Number(await usage.getAttribute('data-test-input-tokens')),
      outputTokens: Number(await usage.getAttribute('data-test-output-tokens')),
    }))
    .toEqual(expected)
}

/**
 * The tokens of a field edit stream (`delegate_text_rewrite`) count in the
 * conversation's usage however the tool ends: the stream spent them.
 *
 * Page lifecycle: a page per test, for its script. They rewrite the same
 * title; only the first one stores a value.
 */
describe('agent: the usage of a field edit stream', async () => {
  const sandbox = workerSandbox()
  await setup({ host: sandboxHost(sandbox) })

  let page: Page | undefined

  beforeAll(() => {
    resetSandbox(sandbox)
  })

  afterEach(async () => {
    await page?.close()
  })

  it('counts the tokens of an applied rewrite', async () => {
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: rewriteScript('Rewritten title', 'Rewritten.'),
    })
    await startRewrite(page)

    const stored = nextMutation(page, 'pbBulkUpdateFieldValues')
    await applyDiff(page)
    await stored
    await waitForAgentReply(page, 'Rewritten.')

    await expectTokenUsage(page, USAGE)
  })

  it('counts the tokens of a rewrite that Drupal rejects', async () => {
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: rewriteScript('a'.repeat(256), 'Not written.'),
    })
    const block = page.locator(`[data-bk-uuid="${TITLE}"]`).first()
    const before = await block.textContent()
    await startRewrite(page)

    // A title takes 255 characters.
    const rejected = nextMutation(page, 'pbBulkUpdateFieldValues')
    await applyDiff(page)
    await rejected
    await waitForAgentReply(page, 'Not written.')
    await expect.poll(() => block.textContent()).toBe(before)

    await expectTokenUsage(page, USAGE)
  })

  it('counts the tokens of a rewrite that is stopped during its approval', async () => {
    page = await openEditor(sandbox, 'Anna Keller', BLOCKS_EDITOR_PATH, {
      mockScript: rewriteScript('Never applied', 'Unreachable.'),
    })
    await startRewrite(page)

    await page.locator('[data-test="agent-cancel"]').click()
    await page
      .locator('[data-test="diff-approval-apply"]')
      .waitFor({ state: 'detached' })

    await expectTokenUsage(page, USAGE)
  })
})
