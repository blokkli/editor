import { agentPrompts } from '#blokkli-build/agent-prompts'
import type {
  AgentPromptContext,
  AgentPromptDefinition,
} from '#blokkli/agent/app/types'
import type { BlokkliApp } from '#blokkli/editor/types/app'

/**
 * Resolve all build-time collected prompts for the given context.
 *
 * Factories are called with the app so they can decide based on runtime state
 * (available features, selection, language, ...). A prompt without an explicit
 * `contexts` is only offered in the block dropdown: prompts are historically
 * written for a selection, so appearing on the welcome screen (where nothing
 * is selected) is opt-in.
 */
export function resolveAgentPrompts(
  app: BlokkliApp,
  context: AgentPromptContext,
): AgentPromptDefinition[] {
  return agentPrompts
    .flatMap((item) => {
      const resolved = '__factory' in item ? item.resolve(app) : item
      return Array.isArray(resolved) ? resolved : [resolved]
    })
    .filter((prompt) => (prompt.contexts ?? ['item']).includes(context))
}
