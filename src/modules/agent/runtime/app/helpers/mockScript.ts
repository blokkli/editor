import type {
  MockRoutingEntry,
  MockScript,
  MockStreamEntry,
} from '#blokkli/agent/shared/types'

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
 * touching the configured LLM. A script without the entry routes to nothing:
 * the server only calls the LLM for conversations without a script.
 */
export function readMockRouting():
  | { skills: string[]; tools: string[] }
  | undefined {
  const script = readMockScript()
  if (!script) return undefined
  const entry = script.find((e): e is MockRoutingEntry => e.type === 'routing')
  return { skills: entry?.skills ?? [], tools: entry?.tools ?? [] }
}

/**
 * Extract the script's optional `stream` entry — what the stream endpoint
 * replays for every field edit stream (`delegate_text_rewrite`) instead of
 * calling the configured LLM. A script without the entry streams no edits.
 */
export function readMockStream(): string | undefined {
  const script = readMockScript()
  if (!script) return undefined
  const entry = script.find((e): e is MockStreamEntry => e.type === 'stream')
  return entry?.content ?? ''
}

/**
 * Whether the agent restores the entity's latest conversation when it
 * connects: always without a script, and with one only when it has a
 * `restore` entry. Tests otherwise start from an empty history: the mock
 * provider derives its turn from the assistant-message count, and parallel
 * tests on the same page would restore each other's conversations.
 */
export function restoresConversation(): boolean {
  const script = readMockScript()
  return !script || script.some((e) => e.type === 'restore')
}
