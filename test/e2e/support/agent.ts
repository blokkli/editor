import type { Page } from 'playwright-core'
import type { AgentToolMap, AgentToolName } from '#blokkli-build/agent-client'

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
