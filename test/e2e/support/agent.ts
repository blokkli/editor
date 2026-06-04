import { expect } from 'vitest'
import type { Page } from 'playwright-core'
import type { AgentToolMap, AgentToolName } from '#blokkli-build/agent-client'
import type { MockScript, Transcript } from '#blokkli/agent/shared/types'
// Side-effect import pulls in the `__BLOKKLI_AGENT_TEST_GET_TRANSCRIPT__`
// global augmentation declared on `Window`. Type-only.
import type {} from '../../../src/modules/agent/runtime/app/helpers/testSeam'
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
 * Pick an option in the `ask_question` tool UI and confirm. Waits for the
 * question card to render, clicks the radio whose `value` matches, then clicks
 * Confirm. Use with mock-script tests where a scripted `ask_question` tool
 * call is followed by a subsequent agent turn that depends on a user choice
 * (the mock provider replays linearly, so the script's next agent turn fires
 * regardless of which option was picked — the test asserts the post-pick
 * behaviour).
 */
export async function answerAgentQuestion(
  page: Page,
  value: string,
): Promise<void> {
  const card = page.locator('[data-test="agent-ask-question"]')
  await card.waitFor({ state: 'visible', timeout: 10_000 })
  await card.locator(`input[type="radio"][value="${value}"]`).click()
  await page.locator('[data-test="agent-ask-question-confirm"]').click()
}

/**
 * Round-trip a `get_transcript` request to the server and return the response.
 * Uses the test seam the agent Container installs in mock mode, so the
 * sidebar must already be open (`openAgentPanel`). The transcript carries the
 * `tools` array as it was at the last LLM request — assert on that to verify
 * routing-driven auto-load actually activated a lazy tool.
 */
export async function getAgentTranscript(page: Page): Promise<Transcript> {
  await page.waitForFunction(
    () => typeof window.__BLOKKLI_AGENT_TEST_GET_TRANSCRIPT__ === 'function',
  )
  return page.evaluate(() =>
    window.__BLOKKLI_AGENT_TEST_GET_TRANSCRIPT__!(),
  ) as Promise<Transcript>
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
