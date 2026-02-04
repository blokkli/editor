import type { SkillDefinition } from './types'

/**
 * Define a blökkli agent skill.
 *
 * Skills are domain-specific guidelines that the AI agent can load on-demand.
 * The getContents function receives the current page context and can return
 * null if the skill is not applicable for that context.
 *
 * @example
 * ```ts
 * export default defineBlokkliAgentSkill({
 *   name: 'my-skill',
 *   description: 'Guidelines for writing content.',
 *   getContents: (context) => {
 *     if (context.entityLanguage !== 'de') {
 *       return null
 *     }
 *     return `# Guidelines\n...`
 *   },
 * })
 * ```
 */
export function defineBlokkliAgentSkill(
  definition: SkillDefinition,
): SkillDefinition {
  return definition
}
