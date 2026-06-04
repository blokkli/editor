import { watch } from '#imports'
import type { ConversationProvider } from '../providers/conversationProvider'
import type { AgentOrchestrator } from '../providers/agentProvider'
import type { Transcript } from '../../shared/types'

/**
 * Dedicated window global where E2E tests reach into the running agent to
 * fetch a transcript without going through the dropdown UI. Mirrors the
 * `__BLOKKLI_AGENT_MOCK_SCRIPT__` pattern: installed by the agent Container
 * only when `enableMock` is true at build time, so it's entirely absent from
 * production bundles.
 */
const GLOBAL_KEY = '__BLOKKLI_AGENT_TEST_GET_TRANSCRIPT__' as const

declare global {
  interface Window {
    [GLOBAL_KEY]?: () => Promise<Transcript>
  }
}

/**
 * Round-trip a `get_transcript` request and resolve when the next transcript
 * payload lands. Clears the current transcript first so the watcher only fires
 * for the fresh response (Vue's `watch` doesn't fire on already-set values).
 */
export function installAgentTestSeam(
  agent: AgentOrchestrator,
  conversation: ConversationProvider,
): void {
  window[GLOBAL_KEY] = () => {
    conversation.transcriptContent.value = null
    return new Promise<Transcript>((resolve) => {
      const stop = watch(conversation.transcriptContent, (value) => {
        if (value) {
          stop()
          resolve(value)
        }
      })
      agent.getTranscript()
    })
  }
}

export function uninstallAgentTestSeam(): void {
  delete window[GLOBAL_KEY]
}
