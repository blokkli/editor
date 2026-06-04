import type { MockRoutingEntry, MockScript } from '#blokkli/agent/shared/types'

/**
 * Dedicated window global where E2E tests stash a mock script before opening
 * the agent. Read by `agentProvider.sendInit()` only when the module config's
 * `enableMock` flag is true; otherwise the entire branch (and this helper)
 * gets tree-shaken out of production bundles.
 */
const GLOBAL_KEY = '__BLOKKLI_AGENT_MOCK_SCRIPT__' as const

declare global {
  interface Window {
    [GLOBAL_KEY]?: MockScript
  }
}

export function readMockScript(): MockScript | undefined {
  if (typeof window === 'undefined') return undefined
  return window[GLOBAL_KEY]
}

/**
 * Extract the script's optional `routing` entry — the skills/tools the mock
 * routing endpoint should return on the first message of a conversation. Used
 * by `fetchRouting` so the test can assert auto-load actually fired without
 * touching the configured LLM.
 */
export function readMockRouting():
  | { skills: string[]; tools: string[] }
  | undefined {
  const script = readMockScript()
  if (!script) return undefined
  const entry = script.find(
    (e): e is MockRoutingEntry => e.type === 'routing',
  )
  if (!entry) return undefined
  return { skills: entry.skills ?? [], tools: entry.tools ?? [] }
}
