import type { InjectionKey } from '#imports'
import type { AgentApp } from '#blokkli/agent/app/types'

export const INJECT_AGENT_APP = Symbol(
  'blokkli_agent_app',
) as InjectionKey<AgentApp>
