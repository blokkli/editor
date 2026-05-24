import type { PageContext } from '../../shared/types'
import type { ResolvedSkill, SkillDefinition } from '../skills/types'
import { skills } from '#blokkli-build/agent-server'

/**
 * Resolve the configured skills against the current page context.
 */

/**
 * Resolve a skill label to a string, optionally using the given language.
 */
export function resolveSkillLabel(
  label: SkillDefinition['label'],
  language?: string,
): string {
  if (typeof label === 'string') return label
  if (language && language in label) {
    return label[language as keyof typeof label] || label.en
  }
  return label.en
}

/**
 * Resolve skills for the given page context.
 * Calls getContents on each skill and filters out nulls.
 */
export function resolveSkills(context: PageContext): ResolvedSkill[] {
  return skills
    .map((skill) => {
      const content = skill.getContents(context)
      if (content === null) return null
      return {
        name: skill.name,
        label: resolveSkillLabel(skill.label, context.interfaceLanguage),
        englishLabel: resolveSkillLabel(skill.label),
        description: skill.description,
        content,
        tools: skill.tools ?? [],
      }
    })
    .filter((s): s is ResolvedSkill => s !== null)
}
