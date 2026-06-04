import type { MockScript } from '#blokkli/agent/shared/types'

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
