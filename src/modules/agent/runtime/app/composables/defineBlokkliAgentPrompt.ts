import type {
  AgentPromptDefinition,
  AgentPromptFactoryInput,
  AgentPromptFactory,
} from '#blokkli/agent/app/types'

/**
 * Define a pre-defined agent prompt that users can select.
 *
 * Prompts are collected at build time and made available in the agent UI.
 *
 * @example Static prompt:
 * ```typescript
 * export default defineBlokkliAgentPrompt({
 *   id: 'translate_blocks',
 *   getLabel: () => 'Translate blocks',
 *   getPrompt: () => 'Translate all blocks on the page to the current language.',
 * })
 * ```
 *
 * @example Factory pattern for dynamic prompts:
 * ```typescript
 * export default defineBlokkliAgentPrompt({
 *   resolve: (app) => {
 *     return [
 *       {
 *         id: 'translate_to_current',
 *         getLabel: () => `Translate to ${app.state.language.value}`,
 *         getPrompt: () => `Translate all blocks to ${app.state.language.value}.`,
 *       },
 *     ]
 *   },
 * })
 * ```
 */

// Overload: static prompt definition
export function defineBlokkliAgentPrompt(
  definition: AgentPromptDefinition,
): AgentPromptDefinition

// Overload: factory pattern
export function defineBlokkliAgentPrompt(
  factory: AgentPromptFactoryInput,
): AgentPromptFactory

// Implementation
export function defineBlokkliAgentPrompt(
  options: AgentPromptDefinition | AgentPromptFactoryInput,
): AgentPromptDefinition | AgentPromptFactory {
  if ('resolve' in options) {
    return { ...options, __factory: true as const } as AgentPromptFactory
  }
  return options
}
