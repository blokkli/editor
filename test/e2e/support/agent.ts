import { expect } from 'vitest'
import type { Page } from 'playwright-core'
import type { AgentToolMap, AgentToolName } from '#blokkli-build/agent-client'
import type { MockScript } from '#blokkli/agent/shared/types'
import { openSidebar } from './sidebar'

/**
 * Invoke an agent client tool directly (no LLM, no WebSocket) and return its
 * result — what the LLM would see in the tool_result `content`, unwrapped from
 * the `{ label, result, affectedUuids }` query envelope.
 *
 * The `test-cases` feature registers this once its sidebar pane mounts, so the
 * test must `openSidebar(page, 'test-cases')` first.
 */
export async function runAgentTool<T extends AgentToolName>(
  page: Page,
  name: T,
  params: AgentToolMap[T]['params'],
): Promise<AgentToolMap[T]['result']> {
  await page.waitForFunction(
    () => typeof window.__BLOKKLI__?.test?.runAgentTool === 'function',
  )
  return page.evaluate(
    ({ name, params }) =>
      window.__BLOKKLI__!.test!.runAgentTool(
        name as AgentToolName,
        params as AgentToolMap[AgentToolName]['params'],
      ),
    { name, params: params as Record<string, unknown> },
  ) as Promise<AgentToolMap[T]['result']>
}

/**
 * Install a mock LLM script on the page. Must be called BEFORE the agent
 * WebSocket connects — the script is read on `init` send, so set it before
 * opening the agent sidebar. The playground sets `enableMock: true` in its
 * agent module config; production builds without that flag ignore the global.
 */
export async function setAgentMockScript(
  page: Page,
  script: MockScript,
): Promise<void> {
  await page.evaluate((s) => {
    window.__BLOKKLI_AGENT_MOCK_SCRIPT__ = s as MockScript
  }, script)
}

/**
 * Open the agent sidebar and clear any auto-restored conversation. The
 * playground's mock adapter persists conversations server-side, so re-opening
 * the panel pulls the previous session back. For mock-script tests, the mock
 * provider derives its turn index from the assistant-message count in the
 * history Session sees — a restored turn pushes our reply past turn 0. Clear
 * unconditionally: if there's nothing to clear, the button never appears.
 *
 * Call after `setAgentMockScript` so the WS-open `init` carries the script.
 */
export async function openAgentPanel(page: Page): Promise<void> {
  await openSidebar(page, 'agent')

  const newConv = page.locator('[data-test="agent-new-conversation"]')
  await newConv
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => newConv.click())
    .catch(() => undefined)
}

/** Type a prompt into the agent input and click submit. */
export async function submitAgentPrompt(
  page: Page,
  prompt: string,
): Promise<void> {
  await page.locator('[data-test="agent-input"] textarea').fill(prompt)
  await page.locator('[data-test="agent-submit"]').click()
}

/**
 * Poll the most recent assistant bubble until its text contains `contains`,
 * then assert. Use this in mock-script tests to wait for the next scripted
 * turn to land in the DOM.
 */
export async function waitForAgentReply(
  page: Page,
  contains: string,
  opts: { timeout?: number } = {},
): Promise<void> {
  await expect
    .poll(
      () =>
        page
          .locator('[data-test="agent-assistant-message"]')
          .last()
          .textContent(),
      { timeout: opts.timeout ?? 10_000 },
    )
    .toContain(contains)
}
