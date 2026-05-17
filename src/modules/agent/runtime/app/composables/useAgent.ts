import { inject } from '#imports'
import { INJECT_AGENT_APP } from '#blokkli/agent/app/helpers/injections'
import type { AgentApp } from '#blokkli/agent/app/types'

/**
 * Access the agent app from any component below the agent Container.
 * Mirrors `useBlokkli()` for the editor.
 */
export function useAgent(optional: true): AgentApp | undefined
export function useAgent(optional?: false): AgentApp
export function useAgent(optional?: boolean): AgentApp | undefined {
  const app = inject(INJECT_AGENT_APP, undefined)
  if (!app) {
    if (optional) {
      return undefined
    }
    throw new Error(
      'useAgent() called outside the agent Container — make sure the agent feature is mounted.',
    )
  }
  return app
}
