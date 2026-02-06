import type { SystemPromptDefinition } from './types'

/**
 * Define a blökkli agent system prompt section.
 *
 * System prompt sections are collected at build time and assembled into the
 * full system prompt at runtime. Each section has a weight that determines
 * its position, and optional mode filtering.
 *
 * @example
 * ```ts
 * export default defineBlokkliAgentSystemPrompt({
 *   id: 'my-section',
 *   title: 'My Section',
 *   weight: 550,
 *   getPrompt: (context) => {
 *     return `Custom prompt content based on ${context.pageContext.title}`
 *   },
 * })
 * ```
 */
export function defineBlokkliAgentSystemPrompt(
  definition: SystemPromptDefinition,
): SystemPromptDefinition {
  return definition
}
